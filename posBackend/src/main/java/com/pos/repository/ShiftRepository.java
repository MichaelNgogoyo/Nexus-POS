package com.pos.repository;

import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import jakarta.persistence.LockModeType;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByCashierIdAndStatus(String cashierId, ShiftStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Shift s WHERE s.id = :id")
    Optional<Shift> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Shift s WHERE s.cashierId = :cashierId AND s.status = :status")
    Optional<Shift> findByCashierIdAndStatusForUpdate(@Param("cashierId") String cashierId,
                                                      @Param("status") ShiftStatus status);
}
