package com.pos.desktop.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record Sale(String id, String receiptNumber, BigDecimal total, BigDecimal tax, BigDecimal discount, LocalDateTime soldAt) {
}
