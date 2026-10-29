package com.pos.dto;

import com.pos.model.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String orderNumber,
        Long supplierId,
        String supplierName,
        PurchaseOrderStatus status,
        List<PurchaseOrderLineResponse> items,
        BigDecimal totalAmount,
        String notes,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime receivedAt) {

    public record PurchaseOrderLineResponse(
            Long productId,
            String productName,
            Integer orderedQuantity,
            Integer receivedQuantity,
            BigDecimal unitCost,
            BigDecimal lineTotal) {
    }
}
