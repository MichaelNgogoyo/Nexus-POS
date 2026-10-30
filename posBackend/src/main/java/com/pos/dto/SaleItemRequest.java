package com.pos.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SaleItemRequest(
        @Positive(message = "Product ID must be positive")
        long productId,

        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 999, message = "Quantity must be 999 or less")
        int quantity,

        @Size(max = 30, message = "Too many modifiers")
        List<@Positive(message = "Modifier ID must be positive") Long> modifierIds,

        @Size(max = 250, message = "Item notes are too long")
        String notes
) {
}
