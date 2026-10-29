package com.pos.controller;

import com.pos.dto.PurchaseOrderCreateRequest;
import com.pos.dto.PurchaseOrderResponse;
import com.pos.dto.PurchaseOrderStatusRequest;
import com.pos.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','STOCK_CLERK','PROCUREMENT_OFFICER')")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public List<PurchaseOrderResponse> getAll() {
        return purchaseOrderService.getAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponse> getById(@PathVariable Long id) {
        return purchaseOrderService.getById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','PROCUREMENT_OFFICER')")
    public ResponseEntity<PurchaseOrderResponse> create(@Valid @RequestBody PurchaseOrderCreateRequest request,
                                                        Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(purchaseOrderService.create(request, authentication.getName()));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','PROCUREMENT_OFFICER')")
    public ResponseEntity<PurchaseOrderResponse> updateStatus(@PathVariable Long id,
                                                              @Valid @RequestBody PurchaseOrderStatusRequest request,
                                                              Authentication authentication) {
        return ResponseEntity.ok(purchaseOrderService.updateStatus(id, request.status(), authentication.getName()));
    }

    @PutMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STOCK_CLERK')")
    public ResponseEntity<PurchaseOrderResponse> receive(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(purchaseOrderService.receive(id, authentication.getName()));
    }
}
