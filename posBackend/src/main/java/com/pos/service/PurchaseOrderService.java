package com.pos.service;

import com.pos.dto.PurchaseOrderCreateRequest;
import com.pos.dto.PurchaseOrderLineRequest;
import com.pos.dto.PurchaseOrderResponse;
import com.pos.model.Product;
import com.pos.model.PurchaseOrder;
import com.pos.model.PurchaseOrderItem;
import com.pos.model.PurchaseOrderStatus;
import com.pos.model.StockMovement;
import com.pos.model.Supplier;
import com.pos.repository.ProductRepository;
import com.pos.repository.PurchaseOrderRepository;
import com.pos.repository.StockMovementRepository;
import com.pos.repository.SupplierRepository;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseOrderService {

    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final AuditService auditService;

    public List<PurchaseOrderResponse> getAll() {
        return purchaseOrderRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public Optional<PurchaseOrderResponse> getById(Long id) {
        return purchaseOrderRepository.findById(id).map(this::toResponse);
    }

    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderCreateRequest request, String actor) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw badRequest("A purchase order must contain at least one product");
        }
        if (request.items().size() > 100) throw badRequest("A purchase order may contain at most 100 product lines");

        Supplier supplier = request.supplierId() == null ? null : supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));

        Set<Long> requestedProductIds = new HashSet<>();
        for (PurchaseOrderLineRequest line : request.items()) {
            if (line == null || line.productId() == null || line.productId() < 1
                    || line.orderedQuantity() == null || line.orderedQuantity() < 1 || line.orderedQuantity() > 100000
                    || line.unitCost() == null || line.unitCost().signum() < 0 || line.unitCost().scale() > 2) {
                throw badRequest("Each purchase line needs a product, quantity from 1 to 100000, and a non-negative cost with at most 2 decimals");
            }
            if (!requestedProductIds.add(line.productId())) {
                throw badRequest("A product can appear only once in a purchase order");
            }
        }

        Map<Long, Product> products = new HashMap<>();
        productRepository.findAllById(requestedProductIds).forEach(product -> products.put(product.getId(), product));
        if (products.size() != requestedProductIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "One or more products were not found");
        }

        PurchaseOrder order = PurchaseOrder.builder()
                .supplier(supplier)
                .status(PurchaseOrderStatus.DRAFT)
                .notes(trimToNull(request.notes()))
                .createdBy(actor)
                .totalAmount(ZERO)
                .items(new ArrayList<>())
                .build();

        BigDecimal total = ZERO;
        for (PurchaseOrderLineRequest line : request.items()) {
            Product product = products.get(line.productId());
            BigDecimal unitCost = line.unitCost().setScale(2, RoundingMode.UNNECESSARY);
            BigDecimal lineTotal = unitCost.multiply(BigDecimal.valueOf(line.orderedQuantity())).setScale(2, RoundingMode.UNNECESSARY);
            total = total.add(lineTotal);
            order.getItems().add(PurchaseOrderItem.builder()
                    .purchaseOrder(order)
                    .productId(product.getId())
                    .productName(product.getName())
                    .orderedQuantity(line.orderedQuantity())
                    .receivedQuantity(0)
                    .unitCost(unitCost)
                    .lineTotal(lineTotal)
                    .build());
        }
        order.setTotalAmount(total);

        PurchaseOrder saved = purchaseOrderRepository.save(order);
        auditService.log(actor, "PURCHASE_ORDER_CREATED", "PurchaseOrder", saved.getId().toString(), null,
                "status=DRAFT; total=" + total.toPlainString());
        return toResponse(saved);
    }

    @Transactional
    public PurchaseOrderResponse updateStatus(Long id, PurchaseOrderStatus requested, String actor) {
        PurchaseOrder order = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found"));
        if (requested == null) throw badRequest("Purchase order status is required");

        PurchaseOrderStatus previous = order.getStatus();
        if (previous == requested) return toResponse(order);
        boolean allowed = (previous == PurchaseOrderStatus.DRAFT
                && (requested == PurchaseOrderStatus.SENT || requested == PurchaseOrderStatus.CANCELLED))
                || (previous == PurchaseOrderStatus.SENT && requested == PurchaseOrderStatus.CANCELLED);
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Purchase order cannot transition from " + previous + " to " + requested);
        }

        order.setStatus(requested);
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        auditService.log(actor, "PURCHASE_ORDER_STATUS_CHANGED", "PurchaseOrder", id.toString(),
                previous.name(), requested.name());
        return toResponse(saved);
    }

    @Transactional
    public PurchaseOrderResponse receive(Long id, String actor) {
        PurchaseOrder order = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase order not found"));
        if (order.getStatus() != PurchaseOrderStatus.SENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a sent purchase order can be received");
        }
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Purchase order has no product lines");
        }

        Map<Long, Integer> receivedByProduct = new HashMap<>();
        for (PurchaseOrderItem item : order.getItems()) {
            if (item.getProductId() == null || item.getOrderedQuantity() == null || item.getOrderedQuantity() < 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Purchase order contains a line that is not linked to a valid catalog product");
            }
            try {
                receivedByProduct.merge(item.getProductId(), item.getOrderedQuantity(), Math::addExact);
            } catch (ArithmeticException exception) {
                throw badRequest("Received quantity exceeds the supported stock range");
            }
        }

        List<Long> productIds = new ArrayList<>(new TreeSet<>(receivedByProduct.keySet()));
        List<Product> lockedProducts = productRepository.findAllByIdForUpdate(productIds);
        if (lockedProducts.size() != productIds.size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Purchase order references a product that no longer exists");
        }

        List<StockMovement> movements = new ArrayList<>();
        for (Product product : lockedProducts) {
            int incoming = receivedByProduct.get(product.getId());
            final int newQuantity;
            try {
                newQuantity = Math.addExact(product.getQuantity(), incoming);
            } catch (ArithmeticException exception) {
                throw badRequest("Received quantity exceeds the supported stock range");
            }
            product.setQuantity(newQuantity);
            movements.add(StockMovement.builder()
                    .product(product)
                    .delta(incoming)
                    .balanceAfter(newQuantity)
                    .reason("Purchase order " + order.getOrderNumber())
                    .build());
        }

        productRepository.saveAll(lockedProducts);
        stockMovementRepository.saveAll(movements);
        order.getItems().forEach(item -> item.setReceivedQuantity(item.getOrderedQuantity()));
        order.setStatus(PurchaseOrderStatus.RECEIVED);
        order.setReceivedAt(LocalDateTime.now());
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        auditService.log(actor, "PURCHASE_ORDER_RECEIVED", "PurchaseOrder", id.toString(), "SENT",
                "RECEIVED; products=" + lockedProducts.size());
        return toResponse(saved);
    }

    private PurchaseOrderResponse toResponse(PurchaseOrder order) {
        Supplier supplier = order.getSupplier();
        List<PurchaseOrderResponse.PurchaseOrderLineResponse> items = order.getItems() == null ? List.of()
                : order.getItems().stream().map(item -> new PurchaseOrderResponse.PurchaseOrderLineResponse(
                        item.getProductId(), item.getProductName(), item.getOrderedQuantity(), item.getReceivedQuantity(),
                        item.getUnitCost(), item.getLineTotal())).toList();
        return new PurchaseOrderResponse(order.getId(), order.getOrderNumber(), supplier == null ? null : supplier.getId(),
                supplier == null ? null : supplier.getName(), order.getStatus(), items, order.getTotalAmount(),
                order.getNotes(), order.getCreatedBy(), order.getCreatedAt(), order.getReceivedAt());
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
