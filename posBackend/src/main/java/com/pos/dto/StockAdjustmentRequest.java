package com.pos.dto;

import jakarta.validation.constraints.NotNull;

public record StockAdjustmentRequest(
        @NotNull(message = "Delta is required")
        Integer delta,
        String reason
) {
}
