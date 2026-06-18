package com.pos.controller;

import com.pos.dto.OrderStatusRequest;
import com.pos.model.OrderItem;
import com.pos.model.OrderStatus;
import com.pos.model.RestaurantOrder;
import com.pos.repository.RestaurantOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final RestaurantOrderRepository orderRepository;

    @GetMapping
    public List<RestaurantOrder> getActiveOrders() {
        return orderRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantOrder> getOrder(@PathVariable Long id) {
        return orderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<RestaurantOrder> createOrder(@RequestBody RestaurantOrder order) {
        return ResponseEntity.ok(orderRepository.save(order));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RestaurantOrder> updateOrder(@PathVariable Long id,
                                                       @RequestBody RestaurantOrder updated) {
        return orderRepository.findById(id).map(existing -> {
            existing.setOrderType(updated.getOrderType());
            existing.setStatus(updated.getStatus());
            existing.setTable(updated.getTable());
            existing.setCashierId(updated.getCashierId());
            existing.setCustomerName(updated.getCustomerName());
            existing.setNotes(updated.getNotes());
            existing.setSubtotal(updated.getSubtotal());
            existing.setTaxAmount(updated.getTaxAmount());
            existing.setDiscountAmount(updated.getDiscountAmount());
            existing.setTotal(updated.getTotal());
            return ResponseEntity.ok(orderRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RestaurantOrder> cancelOrder(@PathVariable Long id) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(OrderStatus.CANCELLED);
            return ResponseEntity.ok(orderRepository.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<RestaurantOrder> updateStatus(@PathVariable Long id,
                                                        @RequestBody OrderStatusRequest request) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(OrderStatus.valueOf(request.getStatus()));
            return ResponseEntity.ok(orderRepository.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<RestaurantOrder> addItem(@PathVariable Long id,
                                                   @RequestBody OrderItem item) {
        return orderRepository.findById(id).map(order -> {
            item.setOrder(order);
            order.getItems().add(item);
            return ResponseEntity.ok(orderRepository.save(order));
        }).orElse(ResponseEntity.notFound().build());
    }
}
