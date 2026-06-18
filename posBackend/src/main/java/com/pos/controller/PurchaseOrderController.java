package com.pos.controller;

import com.pos.model.Product;
import com.pos.model.PurchaseOrder;
import com.pos.model.PurchaseOrderStatus;
import com.pos.repository.ProductRepository;
import com.pos.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductRepository productRepository;

    @GetMapping
    public List<PurchaseOrder> getAll() {
        return purchaseOrderRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrder> getById(@PathVariable Long id) {
        return purchaseOrderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PurchaseOrder> create(@RequestBody PurchaseOrder order) {
        order.setStatus(PurchaseOrderStatus.DRAFT);
        return ResponseEntity.ok(purchaseOrderRepository.save(order));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<PurchaseOrder> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return purchaseOrderRepository.findById(id).map(existing -> {
            existing.setStatus(PurchaseOrderStatus.valueOf(body.get("status")));
            return ResponseEntity.ok(purchaseOrderRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/receive")
    public ResponseEntity<PurchaseOrder> receive(@PathVariable Long id) {
        Optional<PurchaseOrder> optional = purchaseOrderRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        PurchaseOrder order = optional.get();
        order.setStatus(PurchaseOrderStatus.RECEIVED);
        order.setReceivedAt(LocalDateTime.now());

        order.getItems().forEach(item -> {
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(product -> {
                    int received = item.getReceivedQuantity() != null ? item.getReceivedQuantity() : 0;
                    product.setQuantity(product.getQuantity() + received);
                    productRepository.save(product);
                });
            }
        });

        return ResponseEntity.ok(purchaseOrderRepository.save(order));
    }
}
