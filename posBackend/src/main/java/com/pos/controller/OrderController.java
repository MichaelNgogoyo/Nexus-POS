package com.pos.controller;

import com.pos.dto.OrderStatusRequest;
import com.pos.model.*;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.model.Modifier;
import com.pos.model.ModifierGroup;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class OrderController {

    private final RestaurantOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final RestaurantTableRepository tableRepository;
    private final AuditService auditService;
    private final ModifierGroupRepository modifierGroupRepository;
    private final KitchenOrderRepository kitchenOrderRepository;

    @Value("${pos.tax-rate:0}")
    private double taxRate;

    @Value("${pos.service-charge-rate:0}")
    private double serviceChargeRate;

    @PostConstruct
    void validateRates() {
        if (!Double.isFinite(taxRate) || taxRate < 0 || taxRate > 100
                || !Double.isFinite(serviceChargeRate) || serviceChargeRate < 0 || serviceChargeRate > 100) {
            throw new IllegalStateException("POS tax and service charge rates must be between 0 and 100");
        }
    }

    @GetMapping
    public List<RestaurantOrder> getActiveOrders() {
        return orderRepository.findAll(PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantOrder> getOrder(@PathVariable Long id) {
        return orderRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /** Prices, quantities, statuses and totals are server-owned; only item IDs/quantities and service notes are accepted. */
    @PostMapping
    @Transactional
    public ResponseEntity<RestaurantOrder> createOrder(@RequestBody RestaurantOrder request, Authentication authentication) {
        if (request.getIdempotencyKey() == null || request.getIdempotencyKey().length() < 16 || request.getIdempotencyKey().length() > 64) {
            throw badRequest("An idempotency key between 16 and 64 characters is required");
        }
        if (request.getOrderType() == OrderType.ROOM_CHARGE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Room charges are unavailable until hotel folio validation and posting are connected");
        }
        RestaurantOrder previous = orderRepository.findByIdempotencyKey(request.getIdempotencyKey()).orElse(null);
        if (previous != null) return ResponseEntity.ok(previous);
        if (request.getOrderType() == null) throw badRequest("Order type is required");
        validateRoomOrTable(request);
        RestaurantOrder order = RestaurantOrder.builder()
                .orderType(request.getOrderType())
                .idempotencyKey(request.getIdempotencyKey())
                .status(OrderStatus.OPEN)
                .table(resolveTable(request.getTable()))
                .roomNumber(trimToNull(request.getRoomNumber()))
                .cashierId(authentication.getName())
                .customerName(trimLimit(request.getCustomerName(), 120, "Guest name"))
                .notes(trimLimit(request.getNotes(), 500, "Order notes"))
                .items(new ArrayList<>())
                .build();
        priceOrder(order, request.getItems());
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(authentication.getName(), "ORDER_CREATED", "RestaurantOrder", saved.getId().toString(), null, "OPEN");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RestaurantOrder> updateOrder(@PathVariable Long id, @RequestBody RestaurantOrder request, Authentication authentication) {
        RestaurantOrder order = orderRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getStatus() != OrderStatus.OPEN) throw badRequest("Only open orders can be edited");
        if (order.getOrderType() == OrderType.ROOM_CHARGE || request.getOrderType() == OrderType.ROOM_CHARGE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Room charges are unavailable until hotel folio validation and posting are connected");
        }
        if (request.getOrderType() != null) order.setOrderType(request.getOrderType());
        if (request.getRoomNumber() != null) order.setRoomNumber(trimToNull(request.getRoomNumber()));
        if (request.getCustomerName() != null) order.setCustomerName(trimLimit(request.getCustomerName(), 120, "Guest name"));
        if (request.getNotes() != null) order.setNotes(trimLimit(request.getNotes(), 500, "Order notes"));
        if (request.getTable() != null) order.setTable(resolveTable(request.getTable()));
        validateRoomOrTable(order);
        priceOrder(order, request.getItems());
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(authentication.getName(), "ORDER_UPDATED", "RestaurantOrder", id.toString(), "OPEN", "OPEN");
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Transactional
    public ResponseEntity<RestaurantOrder> cancelOrder(@PathVariable Long id, Authentication authentication) {
        RestaurantOrder order = orderRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getStatus() == OrderStatus.PAID || order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.REFUNDED || order.getStatus() == OrderStatus.COMPLETED) {
            throw badRequest("This order cannot be cancelled");
        }
        OrderStatus before = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        kitchenOrderRepository.findByOrder_Id(id).ifPresent(ticket -> {
            if (ticket.getStatus() != KitchenStatus.SERVED) {
                ticket.setStatus(KitchenStatus.CANCELLED);
                if (order.getItems() != null) order.getItems().forEach(item -> item.setKitchenStatus(KitchenStatus.CANCELLED));
                kitchenOrderRepository.save(ticket);
            }
        });
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(authentication.getName(), "ORDER_CANCELLED", "RestaurantOrder", id.toString(), before.name(), "CANCELLED");
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<RestaurantOrder> updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest request, Authentication authentication) {
        RestaurantOrder order = orderRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        OrderStatus next;
        try { next = OrderStatus.valueOf(request.getStatus()); }
        catch (RuntimeException exception) { throw badRequest("Unknown order status"); }
        OrderStatus before = order.getStatus();
        boolean allowed = before == OrderStatus.OPEN && next == OrderStatus.KITCHEN;
        if (!allowed) throw badRequest("Invalid order status transition");
        if (kitchenOrderRepository.findByOrder_Id(id).isEmpty()) {
            kitchenOrderRepository.save(KitchenOrder.builder().order(order).status(KitchenStatus.PENDING).notes(order.getNotes()).build());
        }
        order.setStatus(next);
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(authentication.getName(), "ORDER_STATUS_CHANGED", "RestaurantOrder", id.toString(), before.name(), next.name());
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<RestaurantOrder> addItem(@PathVariable Long id, @RequestBody OrderItem request, Authentication authentication) {
        RestaurantOrder order = orderRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getStatus() != OrderStatus.OPEN) throw badRequest("Only open orders can be edited");
        List<OrderItem> items = new ArrayList<>(order.getItems());
        items.add(request);
        priceOrder(order, items);
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(authentication.getName(), "ORDER_ITEM_ADDED", "RestaurantOrder", id.toString(), null, String.valueOf(request.getProductId()));
        return ResponseEntity.ok(saved);
    }

    private void priceOrder(RestaurantOrder order, List<OrderItem> requestedItems) {
        if (requestedItems == null || requestedItems.isEmpty() || requestedItems.size() > 100) throw badRequest("Order must contain 1–100 items");
        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> pricedItems = new ArrayList<>();
        for (OrderItem requested : requestedItems) {
            if (requested.getProductId() == null || requested.getQuantity() == null || requested.getQuantity() < 1 || requested.getQuantity() > 999) {
                throw badRequest("Each order item needs a product and quantity between 1 and 999");
            }
            Product product = productRepository.findById(requested.getProductId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            if (!product.isActive()) throw badRequest("Product is unavailable: " + product.getName());
            List<Long> modifierIds = requested.getModifiers() == null ? List.of() : requested.getModifiers().stream()
                    .map(Modifier::getId).filter(java.util.Objects::nonNull).toList();
            List<Modifier> modifiers = resolveModifiers(product.getId(), modifierIds);
            BigDecimal modifierTotal = modifiers.stream().map(modifier -> modifier.getAdditionalPrice() == null ? BigDecimal.ZERO : modifier.getAdditionalPrice())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal price = BigDecimal.valueOf(product.getPrice()).add(modifierTotal).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(requested.getQuantity()));
            OrderItem item = OrderItem.builder().order(order).productId(product.getId()).productName(product.getName())
                    .unitPrice(price).quantity(requested.getQuantity()).lineTotal(lineTotal)
                    .notes(trimLimit(requested.getNotes(), 250, "Item notes")).modifiers(modifiers).kitchenStatus(KitchenStatus.PENDING).build();
            pricedItems.add(item);
            subtotal = subtotal.add(lineTotal);
        }
        BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(taxRate / 100)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal service = subtotal.multiply(BigDecimal.valueOf(serviceChargeRate / 100)).setScale(2, RoundingMode.HALF_UP);
        order.getItems().clear();
        order.getItems().addAll(pricedItems);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(BigDecimal.ZERO); // Discounts require manager-authorized server-side policy.
        order.setTaxAmount(tax);
        order.setServiceChargeAmount(service);
        order.setTotal(subtotal.add(tax).add(service));
    }

    private RestaurantTable resolveTable(RestaurantTable requestTable) {
        if (requestTable == null || requestTable.getId() == null) return null;
        return tableRepository.findById(requestTable.getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
    }

    private List<Modifier> resolveModifiers(Long productId, List<Long> requestedIds) {
        if (requestedIds.stream().distinct().count() != requestedIds.size()) throw badRequest("A modifier cannot be selected more than once");
        List<ModifierGroup> groups = modifierGroupRepository.findByProductId(productId);
        List<Modifier> selected = groups.stream().flatMap(group -> group.getModifiers().stream())
                .filter(modifier -> requestedIds.contains(modifier.getId())).toList();
        if (selected.size() != requestedIds.size()) throw badRequest("One or more modifiers are not available for this product");
        for (ModifierGroup group : groups) {
            long count = selected.stream().filter(modifier -> modifier.getGroup().getId().equals(group.getId())).count();
            int minimum = group.getMinSelect() == null ? (Boolean.TRUE.equals(group.getRequired()) ? 1 : 0) : group.getMinSelect();
            int maximum = group.getMaxSelect() == null ? 1 : group.getMaxSelect();
            if (!Boolean.TRUE.equals(group.getMultiSelect())) maximum = Math.min(maximum, 1);
            if (count < minimum || count > maximum) throw badRequest("Choose the required options for " + group.getName());
        }
        if (selected.stream().anyMatch(modifier -> Boolean.FALSE.equals(modifier.getAvailable()))) throw badRequest("One or more selected modifiers are unavailable");
        return selected;
    }

    private void validateRoomOrTable(RestaurantOrder order) {
        if (order.getOrderType() == OrderType.ROOM_CHARGE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Room charges are unavailable until hotel folio validation and posting are connected");
        }
        if (order.getOrderType() == OrderType.DINE_IN && order.getTable() == null) throw badRequest("Select a table for dine-in orders");
    }

    private String trimLimit(String value, int max, String name) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) throw badRequest(name + " is too long");
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToNull(String value) { return value == null ? null : value.trim(); }
    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
