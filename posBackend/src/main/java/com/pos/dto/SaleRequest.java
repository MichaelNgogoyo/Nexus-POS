package com.pos.dto;

public record SaleRequest(
        String cashierId,
        double totalAmount,
        String paymentMethod
) {
}
