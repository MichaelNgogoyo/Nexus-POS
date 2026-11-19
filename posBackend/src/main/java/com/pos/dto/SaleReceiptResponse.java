package com.pos.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SaleReceiptResponse(
        Long saleId,
        String orderNumber,
        LocalDateTime createdAt,
        String cashierId,
        String paymentMethod,
        String orderType,
        Long tableId,
        String guestName,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal serviceChargeAmount,
        BigDecimal totalAmount,
        BigDecimal amountTendered,
        BigDecimal changeGiven,
        List<Item> items
) {
    public record Item(String productName, BigDecimal unitPrice, int quantity, BigDecimal lineTotal,
                       String notes, List<String> modifiers) {}
}
