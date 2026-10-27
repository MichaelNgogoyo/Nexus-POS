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
        @Valid
        List<SaleItemRequest> items,

        /** Amount tendered by customer (e.g. cash handed over). Optional for card payments. */
        @DecimalMin(value = "0.0", message = "Amount tendered cannot be negative")
        Double amountTendered,

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
