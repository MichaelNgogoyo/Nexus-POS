package com.pos.repository;

import com.pos.model.CashMovement;
import com.pos.model.CashMovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {

    List<CashMovement> findByShiftIdOrderByCreatedAtAscIdAsc(Long shiftId);

    Optional<CashMovement> findByIdempotencyKey(String idempotencyKey);

    Optional<CashMovement> findBySaleId(Long saleId);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM CashMovement m WHERE m.shiftId = :shiftId AND m.type = :type")
    BigDecimal sumAmount(@Param("shiftId") Long shiftId, @Param("type") CashMovementType type);
}
