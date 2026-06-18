package com.pos.dto;

import java.util.List;

public record SaleReturnRequest(
        /** Optional reason for the return */
        String reason,
        /** Item IDs to return; if null or empty, the entire sale is returned */
        List<Long> itemIds
) {
}
