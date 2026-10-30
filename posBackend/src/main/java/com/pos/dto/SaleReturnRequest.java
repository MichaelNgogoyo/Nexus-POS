package com.pos.dto;

import java.util.List;
import jakarta.validation.constraints.Size;

public record SaleReturnRequest(
        /** Required reason for the return */
        @jakarta.validation.constraints.NotBlank
        @Size(max = 300, message = "Return reason is too long")
        String reason,
        /** Item IDs to return; if null or empty, the entire sale is returned */
        @Size(max = 100, message = "Too many return items") List<Long> itemIds,
        /** Open register shift paying a cash refund; required for cash sales. */
        Long cashShiftId
) {
}
