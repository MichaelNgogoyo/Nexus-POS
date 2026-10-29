package com.pos.dto;

import com.pos.model.OrderType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record RestaurantOrderRequest(
        OrderType orderType,
        @Size(min = 16, max = 64) String idempotencyKey,
        @Valid TableReference table,
        @Size(max = 24) String roomNumber,
        @Size(max = 120) String customerName,
        @Size(max = 500) String notes,
        @Size(min = 1, max = 100) List<@NotNull @Valid RestaurantOrderItemRequest> items
) {
    public record TableReference(@Positive Long id) {}
}
