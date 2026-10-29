package com.pos.dto;

import com.pos.model.PurchaseOrderStatus;
import jakarta.validation.constraints.NotNull;

public record PurchaseOrderStatusRequest(@NotNull PurchaseOrderStatus status) {
}
