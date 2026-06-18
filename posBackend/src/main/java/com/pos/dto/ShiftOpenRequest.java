package com.pos.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ShiftOpenRequest {
    private String cashierId;
    private String cashierName;
    private BigDecimal openingBalance;
}
