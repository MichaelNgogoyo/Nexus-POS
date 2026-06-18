package com.pos.repository;

import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByCashierIdAndStatus(String cashierId, ShiftStatus status);
}
