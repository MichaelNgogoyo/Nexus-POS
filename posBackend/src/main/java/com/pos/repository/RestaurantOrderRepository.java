package com.pos.repository;

import com.pos.model.OrderStatus;
import com.pos.model.RestaurantOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RestaurantOrderRepository extends JpaRepository<RestaurantOrder, Long> {
    List<RestaurantOrder> findByStatus(OrderStatus status);
    Optional<RestaurantOrder> findByIdempotencyKey(String idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM RestaurantOrder o WHERE o.id = :id")
    Optional<RestaurantOrder> findByIdForUpdate(@Param("id") Long id);
}
