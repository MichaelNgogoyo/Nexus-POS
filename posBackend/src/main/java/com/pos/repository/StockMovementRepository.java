package com.pos.repository;

import com.pos.model.Product;
import com.pos.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<StockMovement> findByProductOrderByCreatedAtDesc(Product product);

    @Query("SELECT COALESCE(SUM(CASE WHEN m.delta > 0 THEN m.delta ELSE 0 END), 0), " +
            "COALESCE(SUM(CASE WHEN m.delta < 0 THEN -m.delta ELSE 0 END), 0) FROM StockMovement m " +
            "WHERE m.createdAt >= :from AND m.createdAt < :to")
    Object[] sumMovementUnitsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
