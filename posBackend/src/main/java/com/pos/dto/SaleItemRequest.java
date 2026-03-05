package com.pos.dto;

public record SaleItemRequest(
        long productId,
        int quantity
) {
}
