package com.pos.dto;

import com.pos.model.KitchenStatus;
import com.pos.model.OrderStatus;
import com.pos.model.OrderType;
import com.pos.model.TableStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RestaurantOrderResponse(
        Long id,
        String orderNumber,
        String idempotencyKey,
        Long saleId,
        OrderType orderType,
        OrderStatus status,
        TableResponse table,
        String cashierId,
        String customerName,
        String roomNumber,
        String notes,
        List<ItemResponse> items,
        BigDecimal subtotal,
        BigDecimal taxAmount,
        BigDecimal serviceChargeAmount,
        BigDecimal discountAmount,
        BigDecimal total,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record TableResponse(Long id, String name, String floor, Integer capacity, TableStatus status, LocalDateTime occupiedAt) {}
    public record ModifierResponse(Long id, String name, BigDecimal additionalPrice, Boolean available) {}
    public record ItemResponse(Long id, Long productId, String productName, BigDecimal unitPrice,
                               Integer quantity, BigDecimal lineTotal, String notes,
                               List<ModifierResponse> modifiers, KitchenStatus kitchenStatus) {}
}
