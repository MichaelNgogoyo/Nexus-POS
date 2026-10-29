package com.pos.controller;

import com.pos.dto.OrderStatusRequest;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.dto.RestaurantOrderResponse;
import com.pos.service.RestaurantOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class OrderController {

    private final RestaurantOrderService orderService;

    @GetMapping
    public List<RestaurantOrderResponse> getActiveOrders() {
        return orderService.getActiveOrders();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantOrderResponse> getOrder(@PathVariable Long id) {
        return orderService.getOrder(id).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Prices, quantities, statuses and totals are server-owned. */
    @PostMapping
    public ResponseEntity<RestaurantOrderResponse> createOrder(@Valid @RequestBody RestaurantOrderRequest request, Authentication authentication) {
        RestaurantOrderService.CreateResult result = orderService.createOrder(request, authentication.getName());
        return result.created()
                ? ResponseEntity.status(HttpStatus.CREATED).body(result.order())
                : ResponseEntity.ok(result.order());
    }

    @PutMapping("/{id}")
    public ResponseEntity<RestaurantOrderResponse> updateOrder(@PathVariable Long id, @Valid @RequestBody RestaurantOrderRequest request, Authentication authentication) {
        return ResponseEntity.ok(orderService.updateOrder(id, request, authentication.getName()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<RestaurantOrderResponse> cancelOrder(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(orderService.cancelOrder(id, authentication.getName()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<RestaurantOrderResponse> updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest request, Authentication authentication) {
        return ResponseEntity.ok(orderService.submitToKitchen(id, request.getStatus(), authentication.getName()));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<RestaurantOrderResponse> addItem(@PathVariable Long id, @Valid @RequestBody RestaurantOrderItemRequest request, Authentication authentication) {
        return ResponseEntity.ok(orderService.addItem(id, request, authentication.getName()));
    }
}
