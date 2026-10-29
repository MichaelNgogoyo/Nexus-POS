package com.pos.service;

import com.pos.model.*;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.dto.RestaurantOrderResponse;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/** Owns restaurant-order validation, pricing, transitions, and related persistence effects. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RestaurantOrderService {

    private final RestaurantOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final RestaurantTableRepository tableRepository;
    private final AuditService auditService;
    private final ModifierGroupRepository modifierGroupRepository;
    private final KitchenOrderRepository kitchenOrderRepository;
    private final RestaurantOrderMapper orderMapper;

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

    public List<RestaurantOrderResponse> getActiveOrders() {
        return orderRepository.findAll(PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent()
                .stream().map(orderMapper::toResponse).toList();
    }

    public Optional<RestaurantOrderResponse> getOrder(Long id) {
        return orderRepository.findById(id).map(orderMapper::toResponse);
    }

    @Transactional
    public CreateResult createOrder(RestaurantOrderRequest request, String actor) {
        if (request.idempotencyKey() == null || request.idempotencyKey().length() < 16 || request.idempotencyKey().length() > 64) {
            throw badRequest("An idempotency key between 16 and 64 characters is required");
        }
        if (request.orderType() == OrderType.ROOM_CHARGE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Room charges are unavailable until hotel folio validation and posting are connected");
        }
        if (request.orderType() == null) throw badRequest("Order type is required");
        if (request.orderType() == OrderType.DINE_IN && request.table() == null) throw badRequest("Select a table for dine-in orders");
        if (request.orderType() != OrderType.DINE_IN && request.table() != null) throw badRequest("Only dine-in orders may select a table");
        RestaurantOrder previous = orderRepository.findByIdempotencyKey(request.idempotencyKey()).orElse(null);
        if (previous != null) {
            if (!Objects.equals(previous.getCashierId(), actor) || !matchesRequest(previous, request)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Idempotency key is already associated with a different operation");
            }
            return new CreateResult(orderMapper.toResponse(previous), false);
        }
        RestaurantTable table = lockAvailableTable(request.table() == null ? null : request.table().id());
        RestaurantOrder orderDraft = RestaurantOrder.builder().orderType(request.orderType()).table(table).build();
        validateRoomOrTable(orderDraft);

        RestaurantOrder order = RestaurantOrder.builder()
                .orderType(request.orderType())
                .idempotencyKey(request.idempotencyKey())
                .status(OrderStatus.OPEN)
                .table(table)
                .roomNumber(trimToNull(request.roomNumber()))
                .cashierId(actor)
                .customerName(trimLimit(request.customerName(), 120, "Guest name"))
                .notes(trimLimit(request.notes(), 500, "Order notes"))
                .items(new ArrayList<>())
                .build();
        priceOrder(order, request.items());
        RestaurantOrder saved = orderRepository.save(order);
        occupyTable(table, actor);
        auditService.log(actor, "ORDER_CREATED", "RestaurantOrder", saved.getId().toString(), null, "OPEN");
        return new CreateResult(orderMapper.toResponse(saved), true);
    }

    private boolean matchesRequest(RestaurantOrder previous, RestaurantOrderRequest request) {
        Long requestedTableId = request.table() == null ? null : request.table().id();
        if (previous.getOrderType() != request.orderType()
                || !Objects.equals(previous.getTable() == null ? null : previous.getTable().getId(), requestedTableId)
                || !Objects.equals(previous.getRoomNumber(), trimToNull(request.roomNumber()))
                || !Objects.equals(previous.getCustomerName(), trimToNull(request.customerName()))
                || !Objects.equals(previous.getNotes(), trimToNull(request.notes()))
                || previous.getItems() == null || request.items() == null
                || previous.getItems().size() != request.items().size()) {
            return false;
        }

        if (request.items().stream().anyMatch(Objects::isNull)) return false;
        List<OrderItemSignature> savedItems = previous.getItems().stream().map(item -> {
            if (item == null) return null;
            List<Long> modifiers = item.getModifiers() == null ? List.of()
                    : item.getModifiers().stream().map(Modifier::getId).sorted().toList();
            return new OrderItemSignature(item.getProductId(), item.getQuantity(), item.getNotes(), modifiers);
        }).toList();
        List<OrderItemSignature> requestedItems = request.items().stream().map(item -> {
            List<Long> modifiers = item.modifiers() == null ? List.of()
                    : item.modifiers().stream().map(RestaurantOrderItemRequest.ModifierReference::id)
                    .filter(Objects::nonNull).sorted().toList();
            return new OrderItemSignature(item.productId(), item.quantity(), trimToNull(item.notes()), modifiers);
        }).toList();
        if (savedItems.stream().anyMatch(Objects::isNull)) return false;
        return signatureCounts(savedItems).equals(signatureCounts(requestedItems));
    }

    private Map<OrderItemSignature, Long> signatureCounts(List<OrderItemSignature> items) {
        return items.stream().collect(Collectors.groupingBy(item -> item, Collectors.counting()));
    }

    private record OrderItemSignature(Long productId, Integer quantity, String notes, List<Long> modifiers) {}

    @Transactional
    public RestaurantOrderResponse updateOrder(Long id, RestaurantOrderRequest request, String actor) {
        RestaurantOrder order = findOrder(id);
        if (order.getStatus() != OrderStatus.OPEN) throw badRequest("Only open orders can be edited");
        if (order.getOrderType() == OrderType.ROOM_CHARGE || request.orderType() == OrderType.ROOM_CHARGE) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Room charges are unavailable until hotel folio validation and posting are connected");
        }
        if (request.orderType() != null) order.setOrderType(request.orderType());
        if (request.roomNumber() != null) order.setRoomNumber(trimToNull(request.roomNumber()));
        if (request.customerName() != null) order.setCustomerName(trimLimit(request.customerName(), 120, "Guest name"));
        if (request.notes() != null) order.setNotes(trimLimit(request.notes(), 500, "Order notes"));
        if (request.table() != null) {
            Long currentTableId = order.getTable() == null ? null : order.getTable().getId();
            Long requestedTableId = request.table().id();
            if (!Objects.equals(currentTableId, requestedTableId)) {
                RestaurantTable newTable = lockAvailableTable(requestedTableId);
                RestaurantTable previousTable = order.getTable();
                if (previousTable != null) {
                    TableStatus previousStatus = previousTable.getStatus();
                    previousTable.setStatus(TableStatus.CLEANING);
                    previousTable.setOccupiedAt(null);
                    tableRepository.save(previousTable);
                    auditService.log(actor, "TABLE_STATUS_CHANGED", "RestaurantTable", previousTable.getId().toString(),
                            previousStatus == null ? null : previousStatus.name(), TableStatus.CLEANING.name());
                }
                order.setTable(newTable);
                occupyTable(newTable, actor);
            }
        }
        validateRoomOrTable(order);
        priceOrder(order, request.items());
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(actor, "ORDER_UPDATED", "RestaurantOrder", id.toString(), "OPEN", "OPEN");
        return orderMapper.toResponse(saved);
    }

    @Transactional
    public RestaurantOrderResponse cancelOrder(Long id, String actor) {
        RestaurantOrder order = findOrder(id);
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
        auditService.log(actor, "ORDER_CANCELLED", "RestaurantOrder", id.toString(), before.name(), "CANCELLED");
        return orderMapper.toResponse(saved);
    }

    @Transactional
    public RestaurantOrderResponse submitToKitchen(Long id, String requestedStatus, String actor) {
        RestaurantOrder order = findOrder(id);
        OrderStatus next;
        try {
            next = OrderStatus.valueOf(requestedStatus);
        } catch (RuntimeException exception) {
            throw badRequest("Unknown order status");
        }
        OrderStatus before = order.getStatus();
        if (before != OrderStatus.OPEN || next != OrderStatus.KITCHEN) throw badRequest("Invalid order status transition");
        if (kitchenOrderRepository.findByOrder_Id(id).isEmpty()) {
            kitchenOrderRepository.save(KitchenOrder.builder().order(order).status(KitchenStatus.PENDING).notes(order.getNotes()).build());
        }
        order.setStatus(next);
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(actor, "ORDER_STATUS_CHANGED", "RestaurantOrder", id.toString(), before.name(), next.name());
        return orderMapper.toResponse(saved);
    }

    @Transactional
    public RestaurantOrderResponse addItem(Long id, RestaurantOrderItemRequest request, String actor) {
        RestaurantOrder order = findOrder(id);
        if (order.getStatus() != OrderStatus.OPEN) throw badRequest("Only open orders can be edited");
        List<RestaurantOrderItemRequest> items = new ArrayList<>(order.getItems().stream().map(item ->
                new RestaurantOrderItemRequest(item.getProductId(), item.getQuantity(), item.getNotes(),
                        item.getModifiers() == null ? List.of() : item.getModifiers().stream()
                                .map(modifier -> new RestaurantOrderItemRequest.ModifierReference(modifier.getId())).toList())
        ).toList());
        items.add(request);
        priceOrder(order, items);
        RestaurantOrder saved = orderRepository.save(order);
        auditService.log(actor, "ORDER_ITEM_ADDED", "RestaurantOrder", id.toString(), null, String.valueOf(request.productId()));
        return orderMapper.toResponse(saved);
    }

    private RestaurantOrder findOrder(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private void priceOrder(RestaurantOrder order, List<RestaurantOrderItemRequest> requestedItems) {
        if (requestedItems == null || requestedItems.isEmpty() || requestedItems.size() > 100) throw badRequest("Order must contain 1–100 items");
        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> pricedItems = new ArrayList<>();
        for (RestaurantOrderItemRequest requested : requestedItems) {
            if (requested.productId() == null || requested.quantity() == null || requested.quantity() < 1 || requested.quantity() > 999) {
                throw badRequest("Each order item needs a product and quantity between 1 and 999");
            }
            Product product = productRepository.findById(requested.productId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            if (!product.isActive()) throw badRequest("Product is unavailable: " + product.getName());
            List<Long> modifierIds = requested.modifiers() == null ? List.of() : requested.modifiers().stream()
                    .map(RestaurantOrderItemRequest.ModifierReference::id).filter(Objects::nonNull).toList();
            List<Modifier> modifiers = resolveModifiers(product.getId(), modifierIds);
            BigDecimal modifierTotal = modifiers.stream().map(modifier -> modifier.getAdditionalPrice() == null ? BigDecimal.ZERO : modifier.getAdditionalPrice())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal price = BigDecimal.valueOf(product.getPrice()).add(modifierTotal).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(requested.quantity())).setScale(2, RoundingMode.HALF_UP);
            OrderItem item = OrderItem.builder().order(order).productId(product.getId()).productName(product.getName())
                    .unitPrice(price).quantity(requested.quantity()).lineTotal(lineTotal)
                    .notes(trimLimit(requested.notes(), 250, "Item notes")).modifiers(modifiers).kitchenStatus(KitchenStatus.PENDING).build();
            pricedItems.add(item);
            subtotal = subtotal.add(lineTotal);
        }
        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(taxRate / 100)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal service = subtotal.multiply(BigDecimal.valueOf(serviceChargeRate / 100)).setScale(2, RoundingMode.HALF_UP);
        order.getItems().clear();
        order.getItems().addAll(pricedItems);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(BigDecimal.ZERO); // Discounts require manager-authorized server-side policy.
        order.setTaxAmount(tax);
        order.setServiceChargeAmount(service);
        order.setTotal(subtotal.add(tax).add(service).setScale(2, RoundingMode.HALF_UP));
    }

    private RestaurantTable lockAvailableTable(Long tableId) {
        if (tableId == null) return null;
        RestaurantTable table = tableRepository.findByIdForUpdate(tableId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found"));
        if (table.getStatus() != TableStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Selected table is no longer available");
        }
        return table;
    }

    private void occupyTable(RestaurantTable table, String actor) {
        if (table == null) return;
        table.setStatus(TableStatus.OCCUPIED);
        table.setOccupiedAt(java.time.LocalDateTime.now());
        tableRepository.save(table);
        auditService.log(actor, "TABLE_STATUS_CHANGED", "RestaurantTable", table.getId().toString(),
                TableStatus.AVAILABLE.name(), TableStatus.OCCUPIED.name());
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
        if (order.getOrderType() != OrderType.DINE_IN && order.getTable() != null) throw badRequest("Only dine-in orders may select a table");
    }

    private String trimLimit(String value, int max, String name) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) throw badRequest(name + " is too long");
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToNull(String value) { return value == null ? null : value.trim(); }
    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }

    public record CreateResult(RestaurantOrderResponse order, boolean created) {}
}
