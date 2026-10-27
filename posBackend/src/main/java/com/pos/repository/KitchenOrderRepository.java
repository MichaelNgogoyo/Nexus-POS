package com.pos.repository;

import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface KitchenOrderRepository extends JpaRepository<KitchenOrder, Long> {
    @EntityGraph(attributePaths = {"order", "order.items", "order.table"})
    List<KitchenOrder> findByStatus(KitchenStatus status);

    @EntityGraph(attributePaths = {"order", "order.items", "order.table"})
    List<KitchenOrder> findByStatusNot(KitchenStatus status);

    java.util.Optional<KitchenOrder> findByOrder_Id(Long orderId);
}
