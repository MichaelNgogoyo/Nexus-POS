package com.pos.desktop.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ReportEntry(String id, LocalDate periodStart, LocalDate periodEnd, BigDecimal grossSales, BigDecimal netSales, BigDecimal taxCollected) {
}
