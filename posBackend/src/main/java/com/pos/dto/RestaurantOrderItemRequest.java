package com.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RestaurantOrderItemRequest(
        @NotNull @Positive Long productId,
        @NotNull @Positive Integer quantity,
        @Size(max = 250) String notes,
        @Size(max = 30) List<@NotNull @Valid ModifierReference> modifiers
) {
    public record ModifierReference(@NotNull @Positive Long id) {}
}
