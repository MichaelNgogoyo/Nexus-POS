package com.pos.service.impl;

import com.pos.dto.SaleRequest;
import com.pos.dto.SaleReturnRequest;
import com.pos.model.Product;
import com.pos.model.SaleItem;
import com.pos.model.SaleStatus;
import com.pos.model.Sales;
import com.pos.model.StockMovement;
import com.pos.model.OrderType;
import com.pos.model.RestaurantTable;
import com.pos.model.TableStatus;
import com.pos.model.RestaurantOrder;
import com.pos.model.OrderItem;
import com.pos.model.OrderStatus;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.model.Modifier;
import com.pos.model.ModifierGroup;
import com.pos.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import jakarta.annotation.PostConstruct;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesService {

    private final SalesRepository repository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final AuditService auditService;
    private final RestaurantTableRepository tableRepository;
    private final ModifierGroupRepository modifierGroupRepository;
    private final RestaurantOrderRepository orderRepository;
    private final KitchenOrderRepository kitchenOrderRepository;

    /** Tax rate as a percentage, e.g. 16 for 16% VAT. Configurable via pos.tax-rate property. */
    @Value("${pos.tax-rate:0}")
    private double taxRatePercent;

    @Value("${pos.service-charge-rate:0}")
    private double serviceChargeRatePercent;

    @PostConstruct
    void validateRates() {
        if (!Double.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent > 100
                || !Double.isFinite(serviceChargeRatePercent) || serviceChargeRatePercent < 0 || serviceChargeRatePercent > 100) {
            throw new IllegalStateException("POS tax and service charge rates must be between 0 and 100");
        }
    }

    @Transactional
    public Sales createSales(SaleRequest request, String actor) {
        Sales prior = repository.findByIdempotencyKey(request.idempotencyKey()).orElse(null);
        if (prior != null) return prior;
        if (!"CASH".equals(request.paymentMethod())) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Only cash checkout is enabled until the configured payment provider is connected");
        }
        if (request.amountTendered() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cash amount tendered is required");
        }
        if (request.orderType() == OrderType.ROOM_CHARGE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Room folio posting is unavailable until the hotel property system is connected");
        }
        if (request.orderType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order type is required");
        }
        if (request.orderType() == OrderType.DINE_IN && request.tableId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a table for dine-in checkout");
        }
        if (request.orderType() != OrderType.DINE_IN && request.tableId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only dine-in orders may select a table");
        }
        if (request.items() == null || request.items().isEmpty() || request.items().size() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale must contain 1–100 items");
        }
        RestaurantTable selectedTable = null;
        if (request.tableId() != null) {
            selectedTable = tableRepository.findByIdForUpdate(request.tableId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
            if (selectedTable.getStatus() != TableStatus.AVAILABLE) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected table is no longer available");
            }
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale must contain at least one item");
        }

        // Batch-load all products in a single query
        List<Long> productIds = request.items().stream()
                .map(i -> i.productId())
                .toList();
        Map<Long, Product> productMap = productRepository.findAllByIdForUpdate(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        if (productMap.size() != productIds.stream().distinct().count()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "One or more products are unavailable");
        }

        Sales sales = Sales.builder()
                .cashierId(actor)
                .paymentMethod(request.paymentMethod())
                .status(SaleStatus.COMPLETED)
                .build();

        List<SaleItem> saleItems = new ArrayList<>();
        List<StockMovement> movements = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (var itemReq : request.items()) {
            Product product = productMap.get(itemReq.productId());
            if (product == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Product not found: " + itemReq.productId());
            }

            if (!product.isActive()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product is unavailable: " + product.getName());
            }
            if (product.getPrice() == null || product.getPrice() < 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Product price is not configured: " + product.getName());
            }
            if (product.getQuantity() < itemReq.quantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock for product: " + product.getName());
            }

            product.setQuantity(product.getQuantity() - itemReq.quantity());
            movements.add(buildStockMovement(product, -itemReq.quantity(), "Direct sale"));

            SaleItem saleItem = new SaleItem();
            saleItem.setProduct(product);
            saleItem.setQuantity(itemReq.quantity());
            List<Modifier> selectedModifiers = resolveModifiers(product.getId(), itemReq.modifierIds());
            BigDecimal modifierTotal = selectedModifiers.stream()
                    .map(modifier -> modifier.getAdditionalPrice() == null ? BigDecimal.ZERO : modifier.getAdditionalPrice())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal unitPrice = BigDecimal.valueOf(product.getPrice()).add(modifierTotal).setScale(2, RoundingMode.HALF_UP);
            saleItem.setPrice(unitPrice.doubleValue());
            saleItem.setModifiers(selectedModifiers);
            saleItem.setNotes(trimLimit(itemReq.notes(), 250, "Item notes"));
            saleItem.setSales(sales);
            saleItems.add(saleItem);

            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(itemReq.quantity())).setScale(2, RoundingMode.HALF_UP));
        }

        BigDecimal taxAmount = subtotal.multiply(BigDecimal.valueOf(taxRatePercent / 100.0)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal serviceChargeAmount = subtotal.multiply(BigDecimal.valueOf(serviceChargeRatePercent / 100.0)).setScale(2, RoundingMode.HALF_UP);
        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(taxAmount).add(serviceChargeAmount).setScale(2, RoundingMode.HALF_UP);

        BigDecimal amountTendered = BigDecimal.valueOf(request.amountTendered()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal changeGiven = amountTendered.subtract(total).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        if (amountTendered.compareTo(total) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Amount tendered (" + amountTendered + ") is less than total (" + total + ")");
        }

        // Persist inventory movements only after the cash tender is confirmed sufficient.
        productRepository.saveAll(productMap.values());
        stockMovementRepository.saveAll(movements);

        sales.setTaxAmount(taxAmount.doubleValue());
        sales.setSubtotalAmount(subtotal.doubleValue());
        sales.setServiceChargeAmount(serviceChargeAmount.doubleValue());
        sales.setTotalAmount(total.doubleValue());
        sales.setAmountTendered(amountTendered.doubleValue());
        sales.setChangeGiven(changeGiven.doubleValue());
        sales.setSaleItems(saleItems);
        sales.setIdempotencyKey(request.idempotencyKey());
        sales.setOrderType(request.orderType());
        sales.setTableId(request.tableId());
        sales.setRoomNumber(request.roomNumber());
        sales.setGuestName(request.guestName());
        sales.setNotes(request.notes());

        RestaurantOrder restaurantOrder = RestaurantOrder.builder()
                .orderType(request.orderType())
                .status(OrderStatus.KITCHEN)
                .table(selectedTable)
                .cashierId(actor)
                .customerName(trimLimit(request.guestName(), 120, "Guest name"))
                .notes(trimLimit(request.notes(), 500, "Order notes"))
                .items(new ArrayList<>())
                .subtotal(subtotal)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(taxAmount)
                .serviceChargeAmount(serviceChargeAmount)
                .total(total)
                .build();
        for (SaleItem saleItem : saleItems) {
            BigDecimal itemPrice = BigDecimal.valueOf(saleItem.getPrice()).setScale(2, RoundingMode.HALF_UP);
            restaurantOrder.getItems().add(OrderItem.builder()
                    .order(restaurantOrder)
                    .productId(saleItem.getProduct().getId())
                    .productName(saleItem.getProduct().getName())
                    .unitPrice(itemPrice)
                    .quantity(saleItem.getQuantity())
                    .lineTotal(itemPrice.multiply(BigDecimal.valueOf(saleItem.getQuantity())).setScale(2, RoundingMode.HALF_UP))
                    .notes(saleItem.getNotes())
                    .modifiers(new ArrayList<>(saleItem.getModifiers()))
                    .kitchenStatus(KitchenStatus.PENDING)
                    .build());
        }
        RestaurantOrder savedOrder = orderRepository.save(restaurantOrder);
        sales.setRestaurantOrderId(savedOrder.getId());
        sales.setOrderNumber(savedOrder.getOrderNumber());

        Sales saved = repository.save(sales);
        savedOrder.setSaleId(saved.getId());
        orderRepository.save(savedOrder);
        kitchenOrderRepository.save(KitchenOrder.builder()
                .order(savedOrder)
                .status(KitchenStatus.PENDING)
                .notes(savedOrder.getNotes())
                .build());
        if (selectedTable != null) {
            selectedTable.setStatus(TableStatus.OCCUPIED);
            selectedTable.setOccupiedAt(LocalDateTime.now());
            tableRepository.save(selectedTable);
        }
        auditService.log(actor, "SALE_CREATED", "Sale", saved.getId().toString(), null,
                "total=" + total + "; payment=" + request.paymentMethod());
        log.info("Sale #{} created — subtotal={} tax={} service={} total={} change={}", saved.getId(), subtotal, taxAmount, serviceChargeAmount, total, changeGiven);
        return saved;
    }

    @Transactional(readOnly = true)
    public Sales viewSale(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
    }

    @Transactional(readOnly = true)
    public Page<Sales> listSales(Pageable pageable) {
        return repository.findAllPaged(pageable);
    }

    @Transactional
    public void deleteSale(Long id, String actor) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found");
        }
        Sales sale = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
        if (sale.getStatus() != SaleStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only completed sales can be voided");
        }
        for (SaleItem item : sale.getSaleItems()) {
            Product product = item.getProduct();
            product.setQuantity(product.getQuantity() + item.getQuantity());
            productRepository.save(product);
            stockMovementRepository.save(buildStockMovement(product, item.getQuantity(), "Sale voided #" + id));
        }
        sale.setStatus(SaleStatus.VOIDED);
        repository.save(sale);
        markLinkedOrderAdjustment(sale, OrderStatus.CANCELLED, actor, "SALE_VOIDED");
        auditService.log(actor, "SALE_VOIDED", "Sale", id.toString(), "COMPLETED",
                "VOIDED amount=" + sale.getTotalAmount() + "; payment=" + sale.getPaymentMethod());
    }

    @Transactional
    public Sales processReturn(Long saleId, SaleReturnRequest request, String actor) {
        // findById uses @EntityGraph("Sales.withItems") which eagerly fetches saleItems + product
        Sales sale = repository.findById(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));

        if (SaleStatus.RETURNED.equals(sale.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale already returned");
        }
        if (SaleStatus.VOIDED.equals(sale.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voided sales cannot be refunded");
        }
        if (request != null && request.itemIds() != null && !request.itemIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Partial returns are not supported");
        }

        List<SaleItem> items = sale.getSaleItems();
        if (items == null) {
            items = new ArrayList<>();
        }

        String reason = (request != null && request.reason() != null && !request.reason().isBlank())
                ? request.reason()
                : "Return for sale #" + saleId;

        List<Product> productsToUpdate = new ArrayList<>();
        List<StockMovement> movements = new ArrayList<>();

        for (SaleItem item : items) {
            // product is already loaded via the Sales.withItems entity graph — no extra query
            Product product = item.getProduct();
            product.setQuantity(product.getQuantity() + item.getQuantity());
            productsToUpdate.add(product);
            movements.add(buildStockMovement(product, item.getQuantity(), reason));
        }

        // Batch-save: 1 query each instead of 2N
        productRepository.saveAll(productsToUpdate);
        stockMovementRepository.saveAll(movements);

        sale.setStatus(SaleStatus.RETURNED);
        Sales saved = repository.save(sale);
        markLinkedOrderAdjustment(sale, OrderStatus.REFUNDED, actor, "SALE_RETURNED");
        auditService.log(actor, "SALE_RETURNED", "Sale", saleId.toString(), "COMPLETED",
                "RETURNED amount=" + sale.getTotalAmount() + "; payment=" + sale.getPaymentMethod() + "; reason=" + reason);
        return saved;
    }

    private void markLinkedOrderAdjustment(Sales sale, OrderStatus status, String actor, String action) {
        if (sale.getRestaurantOrderId() == null) return;
        orderRepository.findById(sale.getRestaurantOrderId()).ifPresent(order -> {
            boolean completedVoid = status == OrderStatus.CANCELLED && order.getStatus() == OrderStatus.COMPLETED;
            if (!completedVoid) {
                order.setStatus(status);
                orderRepository.save(order);
            }
            kitchenOrderRepository.findByOrder_Id(order.getId()).ifPresent(ticket -> {
                if (ticket.getStatus() != KitchenStatus.SERVED) {
                    ticket.setStatus(KitchenStatus.CANCELLED);
                    if (order.getItems() != null) order.getItems().forEach(item -> item.setKitchenStatus(KitchenStatus.CANCELLED));
                    kitchenOrderRepository.save(ticket);
                }
            });
            auditService.log(actor, action + "_ORDER", "RestaurantOrder", order.getId().toString(), null, status.name());
        });
    }

    private StockMovement buildStockMovement(Product product, int delta, String reason) {
        return StockMovement.builder()
                .product(product)
                .delta(delta)
                .balanceAfter(product.getQuantity())
                .reason(reason)
                .build();
    }

    private List<Modifier> resolveModifiers(Long productId, List<Long> requestedIds) {
        List<Long> ids = requestedIds == null ? List.of() : requestedIds;
        if (ids.stream().distinct().count() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A modifier cannot be selected more than once");
        }
        List<ModifierGroup> groups = modifierGroupRepository.findByProductId(productId);
        List<Modifier> selected = groups.stream()
                .flatMap(group -> group.getModifiers().stream())
                .filter(modifier -> ids.contains(modifier.getId()))
                .toList();
        if (selected.size() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more modifiers are not available for this product");
        }
        for (ModifierGroup group : groups) {
            long count = selected.stream().filter(modifier -> modifier.getGroup().getId().equals(group.getId())).count();
            int minimum = group.getMinSelect() == null ? (Boolean.TRUE.equals(group.getRequired()) ? 1 : 0) : group.getMinSelect();
            int maximum = group.getMaxSelect() == null ? 1 : group.getMaxSelect();
            if (!Boolean.TRUE.equals(group.getMultiSelect())) maximum = Math.min(maximum, 1);
            if (count < minimum || count > maximum) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose the required options for " + group.getName());
            }
        }
        if (selected.stream().anyMatch(modifier -> Boolean.FALSE.equals(modifier.getAvailable()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more selected modifiers are unavailable");
        }
        return selected;
    }

    private String trimLimit(String value, int max, String name) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " are too long");
        return trimmed.isEmpty() ? null : trimmed;
    }
}
