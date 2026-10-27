package com.pos.repository;

import com.pos.model.OrderStatus;
import com.pos.model.RestaurantOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RestaurantOrderRepository extends JpaRepository<RestaurantOrder, Long> {
    List<RestaurantOrder> findByStatus(OrderStatus status);
    Optional<RestaurantOrder> findByIdempotencyKey(String idempotencyKey);
}
