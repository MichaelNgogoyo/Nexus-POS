package com.pos.dto;

import jakarta.validation.constraints.NotZero;

public record StockAdjustmentRequest(
        @NotZero(message = "Delta cannot be zero")
        int delta,
        String reason
) {
}
