package com.pos.controller;

import com.pos.dto.KitchenStatusRequest;
import com.pos.dto.KitchenTicketResponse;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.model.OrderStatus;
import com.pos.model.OrderItem;
import com.pos.model.RestaurantOrder;
import com.pos.repository.KitchenOrderRepository;
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

@RestController
@RequestMapping("/api/kitchen")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER','KITCHEN')")
public class KitchenController {

    private final KitchenOrderRepository kitchenOrderRepository;
    private final RestaurantOrderRepository restaurantOrderRepository;
    private final AuditService auditService;

    @GetMapping("/orders")
    public List<KitchenTicketResponse> getAllKitchenOrders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean includeHistory) {
        List<KitchenOrder> tickets;
        if (status != null) {
            try {
                tickets = kitchenOrderRepository.findByStatus(KitchenStatus.valueOf(status));
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown kitchen ticket status");
            }
        } else {
            tickets = includeHistory
                    ? kitchenOrderRepository.findByStatusIn(List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING,
                            KitchenStatus.READY, KitchenStatus.SERVED, KitchenStatus.CANCELLED))
                    : kitchenOrderRepository.findByStatusIn(List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING,
                            KitchenStatus.READY));
        }
        return tickets.stream().map(this::toKitchenTicketResponse).toList();
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
            OrderStatus orderStatus = switch (next) {
                case PREPARING -> OrderStatus.KITCHEN;
                case READY -> OrderStatus.READY;
                case SERVED -> OrderStatus.COMPLETED;
                default -> linkedOrder.getStatus();
            };
            // Kitchen progress must never turn a settled sale back into an unpaid/completed order.
            linkedOrder.setStatus(linkedOrder.getStatus() == OrderStatus.PAID || linkedOrder.getSaleId() != null
                    ? OrderStatus.PAID : orderStatus);
            if (linkedOrder.getItems() != null) {
                for (OrderItem item : linkedOrder.getItems()) item.setKitchenStatus(next);
            }
            restaurantOrderRepository.save(linkedOrder);
            auditService.log(authentication.getName(), "KITCHEN_STATUS_CHANGED", "KitchenOrder", id.toString(), previous.name(), next.name());
        }
        return ResponseEntity.ok(toKitchenTicketResponse(saved));
    }

    private KitchenTicketResponse toKitchenTicketResponse(KitchenOrder ticket) {
        var order = ticket.getOrder();
        if (order == null) {
            return new KitchenTicketResponse(ticket.getId(), ticket.getStatus(), ticket.getReceivedAt(),
                    ticket.getStartedAt(), ticket.getCompletedAt(), ticket.getNotes(), null);
        }
        var table = order.getTable() == null ? null
                : new KitchenTicketResponse.TableSummary(order.getTable().getId(), order.getTable().getName());
        var items = order.getItems() == null ? List.<KitchenTicketResponse.ItemSummary>of() : order.getItems().stream()
                .map(item -> new KitchenTicketResponse.ItemSummary(item.getId(), item.getProductName(), item.getQuantity(),
                        item.getNotes(), item.getModifiers() == null ? List.of() : item.getModifiers().stream()
                                .map(modifier -> new KitchenTicketResponse.ModifierSummary(modifier.getName())).toList(),
                        item.getKitchenStatus()))
                .toList();
        var summary = new KitchenTicketResponse.OrderSummary(order.getId(), order.getOrderNumber(), order.getOrderType(), table, items);
        return new KitchenTicketResponse(ticket.getId(), ticket.getStatus(), ticket.getReceivedAt(),
                ticket.getStartedAt(), ticket.getCompletedAt(), ticket.getNotes(), summary);
    }
}
