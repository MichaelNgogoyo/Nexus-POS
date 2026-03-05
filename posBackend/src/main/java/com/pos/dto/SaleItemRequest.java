package com.pos.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;

public record SaleItemRequest(
        @Positive(message = "Product ID must be positive")
        long productId,

        @Min(value = 1, message = "Quantity must be at least 1")
        int quantity
) {
}
