package com.pos.dto;

import com.pos.model.CashMovementType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CashMovementRequest(
        @NotNull CashMovementType type,
        @NotNull @DecimalMin(value = "0.00", inclusive = false) @Digits(integer = 17, fraction = 2) BigDecimal amount,
        @NotBlank @Size(max = 300) String reason,
        @NotBlank @Size(max = 80) String idempotencyKey
) {
}
