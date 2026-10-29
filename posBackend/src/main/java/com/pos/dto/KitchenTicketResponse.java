package com.pos.dto;

import com.pos.model.KitchenStatus;
import com.pos.model.OrderType;

import java.time.LocalDateTime;
import java.util.List;

/** Kitchen-only projection: deliberately excludes customer identity, cashier data, and monetary values. */
public record KitchenTicketResponse(
        Long id,
        KitchenStatus status,
        LocalDateTime receivedAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        String notes,
        OrderSummary order
) {
    public record OrderSummary(Long id, String orderNumber, OrderType orderType, TableSummary table,
                               List<ItemSummary> items) {}

    public record TableSummary(Long id, String name) {}

    public record ItemSummary(Long id, String productName, Integer quantity, String notes,
                              List<ModifierSummary> modifiers, KitchenStatus kitchenStatus) {}

    public record ModifierSummary(String name) {}
}
