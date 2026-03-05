package com.pos.dto;

import jakarta.validation.constraints.*;

public record ProductRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 255, message = "Product name must not exceed 255 characters")
        String name,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        Double price,

        Boolean active,

        @DecimalMin(value = "0.0", message = "Discount cannot be negative")
        @DecimalMax(value = "100.0", message = "Discount cannot exceed 100%")
        double discount,

        @Min(value = 0, message = "Quantity cannot be negative")
        int quantity,

        String category,

        @Size(max = 50, message = "SKU must not exceed 50 characters")
        String sku,

        @Size(max = 50, message = "Barcode must not exceed 50 characters")
        String barcode,

        /** Alert threshold — defaults to 5 if not provided */
        @Min(value = 0, message = "Low stock threshold cannot be negative")
        Integer lowStockThreshold
) {
}
