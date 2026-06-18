package com.pos.repository;

import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KitchenOrderRepository extends JpaRepository<KitchenOrder, Long> {
    List<KitchenOrder> findByStatus(KitchenStatus status);
}
