package com.pos.repository;

import com.pos.model.ModifierGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;

public interface ModifierGroupRepository extends JpaRepository<ModifierGroup, Long> {
    @EntityGraph(attributePaths = "modifiers")
    List<ModifierGroup> findByProductId(Long productId);
}
