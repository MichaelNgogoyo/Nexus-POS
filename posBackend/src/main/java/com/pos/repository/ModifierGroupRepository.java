package com.pos.repository;

import com.pos.model.ModifierGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ModifierGroupRepository extends JpaRepository<ModifierGroup, Long> {
    List<ModifierGroup> findByProductId(Long productId);
}
