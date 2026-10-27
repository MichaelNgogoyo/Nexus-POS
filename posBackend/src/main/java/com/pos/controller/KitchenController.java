package com.pos.controller;

import com.pos.dto.KitchenStatusRequest;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.model.OrderStatus;
import com.pos.model.OrderItem;
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
    public List<KitchenOrder> getAllKitchenOrders(
            @RequestParam(required = false) String status) {
        if (status != null) {
            try {
                return kitchenOrderRepository.findByStatus(KitchenStatus.valueOf(status));
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown kitchen ticket status");
            }
        }
        return kitchenOrderRepository.findByStatusNot(KitchenStatus.CANCELLED);
    }

    @PutMapping("/orders/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','KITCHEN')")
    @Transactional
    public ResponseEntity<KitchenOrder> updateStatus(@PathVariable Long id,
                                                     @Valid @RequestBody KitchenStatusRequest request,
                                                     Authentication authentication) {
        KitchenOrder ticket = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kitchen ticket not found"));
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
        if (ticket.getOrder() != null) {
            OrderStatus orderStatus = switch (next) {
                case PREPARING -> OrderStatus.KITCHEN;
                case READY -> OrderStatus.READY;
                case SERVED -> OrderStatus.COMPLETED;
                default -> ticket.getOrder().getStatus();
            };
            ticket.getOrder().setStatus(orderStatus);
            if (ticket.getOrder().getItems() != null) {
                for (OrderItem item : ticket.getOrder().getItems()) item.setKitchenStatus(next);
            }
            restaurantOrderRepository.save(ticket.getOrder());
            auditService.log(authentication.getName(), "KITCHEN_STATUS_CHANGED", "KitchenOrder", id.toString(), previous.name(), next.name());
        }
        return ResponseEntity.ok(saved);
    }
}
