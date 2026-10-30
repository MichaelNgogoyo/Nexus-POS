package com.pos.dto;

import com.pos.model.CashMovement;
import com.pos.model.CashMovementType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CashMovementResponse(
        Long id,
        Long shiftId,
        CashMovementType type,
        BigDecimal amount,
        String reason,
        Long saleId,
        String createdBy,
        LocalDateTime createdAt
) {
    public static CashMovementResponse from(CashMovement movement) {
        return new CashMovementResponse(
                movement.getId(), movement.getShiftId(), movement.getType(), movement.getAmount(),
                movement.getReason(), movement.getSaleId(), movement.getCreatedBy(), movement.getCreatedAt());
    }
}
