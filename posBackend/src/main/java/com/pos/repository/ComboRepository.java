package com.pos.repository;

import com.pos.model.Combo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComboRepository extends JpaRepository<Combo, Long> {
    List<Combo> findByActiveTrue();
}
