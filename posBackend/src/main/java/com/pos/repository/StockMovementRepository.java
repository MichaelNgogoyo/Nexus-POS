package com.pos.repository;

import com.pos.model.Product;
import com.pos.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByProductOrderByCreatedAtDesc(Product product);
}
