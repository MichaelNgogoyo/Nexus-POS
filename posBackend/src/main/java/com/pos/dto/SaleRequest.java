package com.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record SaleRequest(
        @NotBlank(message = "Cashier ID is required")
        String cashierId,

        @NotBlank(message = "Payment method is required")
        String paymentMethod,

        @NotEmpty(message = "Sale must contain at least one item")
        @Valid
        List<SaleItemRequest> items,

        /** Amount tendered by customer (e.g. cash handed over). Optional for card payments. */
        @DecimalMin(value = "0.0", message = "Amount tendered cannot be negative")
        Double amountTendered
) {
}
