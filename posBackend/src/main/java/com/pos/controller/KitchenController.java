package com.pos.controller;

import com.pos.dto.OrderStatusRequest;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.repository.KitchenOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/kitchen")
@RequiredArgsConstructor
public class KitchenController {

    private final KitchenOrderRepository kitchenOrderRepository;

    @GetMapping("/orders")
    public List<KitchenOrder> getAllKitchenOrders(
            @RequestParam(required = false) String status) {
        if (status != null) {
            return kitchenOrderRepository.findByStatus(KitchenStatus.valueOf(status));
        }
        return kitchenOrderRepository.findAll();
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<KitchenOrder> updateStatus(@PathVariable Long id,
                                                     @RequestBody OrderStatusRequest request) {
        return kitchenOrderRepository.findById(id).map(ko -> {
            KitchenStatus newStatus = KitchenStatus.valueOf(request.getStatus());
            ko.setStatus(newStatus);
            if (newStatus == KitchenStatus.PREPARING && ko.getStartedAt() == null) {
                ko.setStartedAt(LocalDateTime.now());
            } else if (newStatus == KitchenStatus.READY && ko.getCompletedAt() == null) {
                ko.setCompletedAt(LocalDateTime.now());
            }
            return ResponseEntity.ok(kitchenOrderRepository.save(ko));
        }).orElse(ResponseEntity.notFound().build());
    }
}
