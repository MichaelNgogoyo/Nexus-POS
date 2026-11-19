package com.pos.controller;

import com.pos.dto.KitchenStatusRequest;
import com.pos.dto.KitchenTicketResponse;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.model.OrderStatus;
import com.pos.model.OrderItem;
import com.pos.model.RestaurantOrder;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.OrderItemRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/kitchen")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER','KITCHEN')")
public class KitchenController {

    private final KitchenOrderRepository kitchenOrderRepository;
    private final RestaurantOrderRepository restaurantOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public List<KitchenTicketResponse> getAllKitchenOrders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean includeHistory,
            @RequestParam(required = false) String station) {
        List<KitchenOrder> tickets;
        String selectedStation = normalizeStation(station);
        if (status != null) {
            try {
                KitchenStatus selectedStatus = KitchenStatus.valueOf(status.trim().toUpperCase(java.util.Locale.ROOT));
                tickets = selectedStation == null
                        ? kitchenOrderRepository.findByStatus(selectedStatus)
                        : kitchenOrderRepository.findByStatusAndKitchenStationIgnoreCase(selectedStatus, selectedStation);
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown kitchen ticket status");
            }
        } else {
            List<KitchenStatus> includedStatuses = includeHistory
                    ? List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING, KitchenStatus.READY,
                            KitchenStatus.SERVED, KitchenStatus.CANCELLED)
                    : List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING, KitchenStatus.READY);
            tickets = selectedStation == null
                    ? kitchenOrderRepository.findByStatusIn(includedStatuses)
                    : kitchenOrderRepository.findByStatusInAndKitchenStationIgnoreCase(includedStatuses, selectedStation);
        }
        List<Long> orderIds = tickets.stream().map(KitchenOrder::getOrder).filter(java.util.Objects::nonNull)
                .map(RestaurantOrder::getId).distinct().toList();
        Map<Long, List<OrderItem>> itemsByOrderId = orderIds.isEmpty() ? Map.of()
                : orderItemRepository.findByOrder_IdIn(orderIds).stream()
                        .filter(item -> item.getOrder() != null)
                        .collect(Collectors.groupingBy(item -> item.getOrder().getId()));
        return tickets.stream().map(ticket -> toKitchenTicketResponse(ticket,
                ticket.getOrder() == null ? List.of() : itemsByOrderId.getOrDefault(ticket.getOrder().getId(), List.of())))
                .toList();
    }

    public List<KitchenTicketResponse> getAllKitchenOrders(String status, boolean includeHistory) {
        return getAllKitchenOrders(status, includeHistory, null);
    }

    @GetMapping("/stations")
    public List<String> getKitchenStations() {
        List<String> stations = productRepository.findActiveKitchenStations().stream()
                .map(this::normalizeStation).filter(java.util.Objects::nonNull).distinct().toList();
        return stations.isEmpty() ? List.of("MAIN") : stations;
    }

    @PutMapping("/orders/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','KITCHEN')")
    @Transactional
    public ResponseEntity<KitchenTicketResponse> updateStatus(@PathVariable Long id,
                                                               @Valid @RequestBody KitchenStatusRequest request,
                                                               Authentication authentication) {
        KitchenOrder observed = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kitchen ticket not found"));
        Long linkedOrderId = observed.getOrder() == null ? null : observed.getOrder().getId();
        RestaurantOrder linkedOrder = linkedOrderId == null ? null : restaurantOrderRepository.findByIdForUpdate(linkedOrderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Kitchen ticket order no longer exists"));
        // All ticket transitions acquire locks in order -> ticket sequence, matching cancellation and payment flows.
        KitchenOrder ticket = kitchenOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kitchen ticket not found"));
        if (linkedOrder != null && (linkedOrder.getStatus() == OrderStatus.CANCELLED
                || linkedOrder.getStatus() == OrderStatus.REFUNDED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancelled or refunded orders cannot advance in the kitchen");
        }
        KitchenStatus next = KitchenStatus.valueOf(request.getStatus());
        KitchenStatus previous = ticket.getStatus();
        boolean allowed = switch (previous) {
            case PENDING -> next == KitchenStatus.PREPARING;
            case PREPARING -> next == KitchenStatus.READY;
            case READY -> next == KitchenStatus.SERVED;
            default -> false;
        };
        if (!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid kitchen ticket status transition");
        ticket.setStatus(next);
        if (next == KitchenStatus.PREPARING && ticket.getStartedAt() == null) ticket.setStartedAt(LocalDateTime.now());
        if ((next == KitchenStatus.READY || next == KitchenStatus.SERVED) && ticket.getCompletedAt() == null) ticket.setCompletedAt(LocalDateTime.now());
        KitchenOrder saved = kitchenOrderRepository.save(ticket);
        if (linkedOrder != null) {
            String station = normalizeStation(ticket.getKitchenStation());
            if (linkedOrder.getItems() != null) {
                for (OrderItem item : linkedOrder.getItems()) {
                    if (station.equals(normalizeStation(item.getKitchenStation()))) item.setKitchenStatus(next);
                }
            }
            List<KitchenOrder> tickets = kitchenOrderRepository.findAllByOrder_Id(linkedOrderId);
            List<KitchenStatus> stationStatuses = tickets.stream().map(KitchenOrder::getStatus).toList();
            OrderStatus orderStatus = aggregateOrderStatus(stationStatuses, linkedOrder.getStatus());
            // Kitchen progress must never turn a settled sale back into an unpaid/completed order.
            linkedOrder.setStatus(linkedOrder.getStatus() == OrderStatus.PAID || linkedOrder.getSaleId() != null
                    ? OrderStatus.PAID : orderStatus);
            restaurantOrderRepository.save(linkedOrder);
            auditService.log(authentication.getName(), "KITCHEN_STATUS_CHANGED", "KitchenOrder", id.toString(), previous.name(), next.name());
        }
        List<OrderItem> responseItems = linkedOrderId == null ? List.of()
                : orderItemRepository.findByOrder_IdIn(List.of(linkedOrderId));
        return ResponseEntity.ok(toKitchenTicketResponse(saved, responseItems));
    }

    private KitchenTicketResponse toKitchenTicketResponse(KitchenOrder ticket, List<OrderItem> routedItems) {
        var order = ticket.getOrder();
        if (order == null) {
            return new KitchenTicketResponse(ticket.getId(), normalizeStation(ticket.getKitchenStation()), ticket.getStatus(), ticket.getReceivedAt(),
                    ticket.getStartedAt(), ticket.getCompletedAt(), ticket.getNotes(), null);
        }
        var table = order.getTable() == null ? null
                : new KitchenTicketResponse.TableSummary(order.getTable().getId(), order.getTable().getName());
        String station = normalizeStation(ticket.getKitchenStation());
        var items = routedItems.stream()
                .filter(item -> station.equals(normalizeStation(item.getKitchenStation())))
                .map(item -> new KitchenTicketResponse.ItemSummary(item.getId(), item.getProductName(), item.getQuantity(),
                        item.getNotes(), item.getModifiers() == null ? List.of() : item.getModifiers().stream()
                                .map(modifier -> new KitchenTicketResponse.ModifierSummary(modifier.getName())).toList(),
                        item.getKitchenStatus()))
                .toList();
        var summary = new KitchenTicketResponse.OrderSummary(order.getId(), order.getOrderNumber(), order.getOrderType(), table, items);
        return new KitchenTicketResponse(ticket.getId(), station, ticket.getStatus(), ticket.getReceivedAt(),
                ticket.getStartedAt(), ticket.getCompletedAt(), ticket.getNotes(), summary);
    }

    private OrderStatus aggregateOrderStatus(List<KitchenStatus> statuses, OrderStatus current) {
        if (statuses.isEmpty() || statuses.contains(KitchenStatus.CANCELLED)) return current;
        if (statuses.stream().allMatch(status -> status == KitchenStatus.SERVED)) return OrderStatus.COMPLETED;
        if (statuses.stream().allMatch(status -> status == KitchenStatus.READY || status == KitchenStatus.SERVED)) {
            return OrderStatus.READY;
        }
        return OrderStatus.KITCHEN;
    }

    private String normalizeStation(String station) {
        return station == null || station.isBlank() ? null
                : station.trim().replaceAll("\\s+", " ").toUpperCase(java.util.Locale.ROOT);
    }
}
