package com.pos.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTableRequest(
        @NotBlank(message = "Table name is required")
        @Size(max = 64, message = "Table name must be 64 characters or fewer")
        String name,

        @Size(max = 64, message = "Area name must be 64 characters or fewer")
        String floor,

        @Min(value = 1, message = "Capacity must be at least one")
        @Max(value = 1000, message = "Capacity must be 1000 or fewer")
        Integer capacity
) {}
