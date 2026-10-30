package com.pos.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record OrderPaymentRequest(
        @NotNull(message = "Cash amount tendered is required")
        @DecimalMin(value = "0.00", message = "Amount tendered cannot be negative")
        @DecimalMax(value = "1000000000.00", message = "Amount tendered is too large")
        @Digits(integer = 10, fraction = 2, message = "Amount tendered may have at most two decimal places")
        BigDecimal amountTendered,

        @NotBlank(message = "Idempotency key is required")
        @Size(min = 16, max = 64, message = "Idempotency key must be 16–64 characters")
        String idempotencyKey
) {}
