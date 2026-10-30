package com.pos.controller;

import com.pos.dto.OrderStatusRequest;
import com.pos.dto.OrderPaymentRequest;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.dto.RestaurantOrderResponse;
import com.pos.service.RestaurantOrderService;
import com.pos.service.impl.SalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class OrderController {

    private final RestaurantOrderService orderService;
    private final SalesService salesService;

    @GetMapping
    public List<RestaurantOrderResponse> getActiveOrders(Authentication authentication) {
        return orderService.getActiveOrders(actorIdentities(authentication), isManager(authentication));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantOrderResponse> getOrder(@PathVariable Long id, Authentication authentication) {
        return orderService.getOrder(id, actorIdentities(authentication), isManager(authentication)).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Prices, quantities, statuses and totals are server-owned. */
    @PostMapping
    public ResponseEntity<RestaurantOrderResponse> createOrder(@Valid @RequestBody RestaurantOrderRequest request, Authentication authentication) {
        RestaurantOrderService.CreateResult result = orderService.createOrder(request, actorId(authentication), actorIdentities(authentication));
        return result.created()
                ? ResponseEntity.status(HttpStatus.CREATED).body(result.order())
                : ResponseEntity.ok(result.order());
    }

    @PostMapping("/submit")
    public ResponseEntity<RestaurantOrderResponse> createAndSubmitOrder(@Valid @RequestBody RestaurantOrderRequest request, Authentication authentication) {
        RestaurantOrderService.CreateResult result = orderService.createAndSubmitOrder(request, actorId(authentication), actorIdentities(authentication));
        return result.created()
                ? ResponseEntity.status(HttpStatus.CREATED).body(result.order())
                : ResponseEntity.ok(result.order());
    }

    @PutMapping("/{id}")
    public ResponseEntity<RestaurantOrderResponse> updateOrder(@PathVariable Long id, @Valid @RequestBody RestaurantOrderRequest request, Authentication authentication) {
        return ResponseEntity.ok(orderService.updateOrder(id, request, actorId(authentication),
                actorIdentities(authentication), isManager(authentication)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<RestaurantOrderResponse> cancelOrder(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(orderService.cancelOrder(id, actorId(authentication),
                actorIdentities(authentication), isManager(authentication)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<RestaurantOrderResponse> updateStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest request, Authentication authentication) {
        return ResponseEntity.ok(orderService.submitToKitchen(id, request.getStatus(), actorId(authentication),
                actorIdentities(authentication), isManager(authentication)));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<RestaurantOrderResponse> addItem(@PathVariable Long id, @Valid @RequestBody RestaurantOrderItemRequest request, Authentication authentication) {
        return ResponseEntity.ok(orderService.addItem(id, request, actorId(authentication),
                actorIdentities(authentication), isManager(authentication)));
    }

    @PostMapping("/{id}/payment")
    public ResponseEntity<com.pos.model.Sales> recordCashPayment(@PathVariable Long id,
            @Valid @RequestBody OrderPaymentRequest request, Authentication authentication) {
        String actor = actorId(authentication);
        return ResponseEntity.ok(salesService.settleOrderCash(id, request, actor,
                actorIdentities(authentication), isManager(authentication)));
    }

    private Set<String> actorIdentities(Authentication authentication) {
        Set<String> identities = new LinkedHashSet<>();
        if (authentication.getName() != null) identities.add(authentication.getName());
        if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt
                && jwt.getSubject() != null) identities.add(jwt.getSubject());
        return identities;
    }

    private String actorId(Authentication authentication) {
        return authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt
                ? jwt.getSubject() : authentication.getName();
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(authority ->
                authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_MANAGER"));
    }
}
