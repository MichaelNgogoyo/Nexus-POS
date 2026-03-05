package com.pos.repository;

import com.pos.model.Sales;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SalesRepository extends JpaRepository<Sales, Long> {

    @EntityGraph("Sales.withItems")
    Page<Sales> findAll(Pageable pageable);

    @EntityGraph("Sales.withItems")
    Optional<Sales> findById(Long id);
}
