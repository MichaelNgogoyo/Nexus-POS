package com.pos.repository;

import com.pos.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByNameContainingIgnoreCase(String name);
}
