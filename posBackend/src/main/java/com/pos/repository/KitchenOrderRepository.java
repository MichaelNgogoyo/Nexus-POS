package com.pos.repository;

import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

public interface KitchenOrderRepository extends JpaRepository<KitchenOrder, Long> {
    @EntityGraph(attributePaths = {"order", "order.items", "order.table"})
    List<KitchenOrder> findByStatus(KitchenStatus status);

    @EntityGraph(attributePaths = {"order", "order.items", "order.table"})
    List<KitchenOrder> findByStatusNot(KitchenStatus status);

    @EntityGraph(attributePaths = {"order", "order.items", "order.table"})
    List<KitchenOrder> findByStatusIn(Collection<KitchenStatus> statuses);

    java.util.Optional<KitchenOrder> findByOrder_Id(Long orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT k FROM KitchenOrder k WHERE k.id = :id")
    Optional<KitchenOrder> findByIdForUpdate(@Param("id") Long id);
}
