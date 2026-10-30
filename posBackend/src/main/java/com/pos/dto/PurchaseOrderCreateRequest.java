package com.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PurchaseOrderCreateRequest(
        Long supplierId,
        @Size(max = 500) String notes,
        @NotEmpty @Size(max = 100) List<@NotNull @Valid PurchaseOrderLineRequest> items) {
}
