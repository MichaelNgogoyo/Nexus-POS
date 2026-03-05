package com.pos.dto;

import java.util.List;

public record SaleRequest(
        String cashierId,
        String paymentMethod,
        List<SaleItemRequest> items
) {
}
