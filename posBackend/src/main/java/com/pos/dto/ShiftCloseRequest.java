package com.pos.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ShiftCloseRequest {
    private BigDecimal closingBalance;
    private String notes;
}
