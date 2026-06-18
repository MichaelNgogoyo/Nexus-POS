package com.pos.repository;

import com.pos.model.PurchaseOrder;
import com.pos.model.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findByStatus(PurchaseOrderStatus status);
    List<PurchaseOrder> findAllByOrderByCreatedAtDesc();
}
