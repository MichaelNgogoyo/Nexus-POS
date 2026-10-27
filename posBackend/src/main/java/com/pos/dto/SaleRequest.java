package com.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import com.pos.model.OrderType;

import java.util.List;

public record SaleRequest(
        @NotBlank(message = "Cashier ID is required")
        String cashierId,

        @NotBlank(message = "Payment method is required")
        @Pattern(regexp = "CASH|MPESA|CARD|MIXED|ROOM_CHARGE", message = "Unsupported payment method")
        String paymentMethod,

        @NotEmpty(message = "Sale must contain at least one item")
        @Size(max = 100, message = "Sale cannot contain more than 100 items")
        @Valid
        List<SaleItemRequest> items,

        /** Cash tendered by the customer. Required for the currently supported cash flow. */
        @NotNull(message = "Cash amount tendered is required")
        @DecimalMin(value = "0.0", message = "Amount tendered cannot be negative")
        @DecimalMax(value = "1000000000.00", message = "Amount tendered is too large")
        Double amountTendered,

        @NotNull(message = "Order type is required")
        OrderType orderType,

        @Positive(message = "Table ID must be positive")
        Long tableId,

        @Size(max = 24, message = "Room number is too long")
        String roomNumber,

        @Size(max = 120, message = "Guest name is too long")
        String guestName,

        @Size(max = 500, message = "Order notes are too long")
        String notes,

        @NotBlank(message = "Idempotency key is required")
        @Size(min = 16, max = 64, message = "Idempotency key must be 16–64 characters")
        String idempotencyKey
) {
    @AssertTrue(message = "Room number is required for room-charge orders")
    public boolean isRoomNumberValidForOrderType() {
        return orderType != OrderType.ROOM_CHARGE || (roomNumber != null && !roomNumber.isBlank());
    }

    @AssertTrue(message = "Room-charge orders must use ROOM_CHARGE payment method")
    public boolean isRoomChargePaymentMethodValid() {
        return orderType != OrderType.ROOM_CHARGE || "ROOM_CHARGE".equals(paymentMethod);
    }
}
