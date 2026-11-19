package com.pos.dto;

import java.math.BigDecimal;
import java.util.List;

/** Date-bounded management analytics backed only by persisted POS records. */
public record AnalyticsResponse(
        String from,
        String to,
        String previousFrom,
        String previousTo,
        SalesKpis sales,
        ProfitSummary profit,
        InventorySummary inventory,
        OperationsSummary operations,
        CustomerSummary customers,
        List<DailyPoint> daily,
        List<HourlyPoint> hourly,
        List<PaymentPoint> payments,
        List<CategoryPoint> categories,
        List<ProductPoint> products,
        List<CashierPoint> cashiers,
        List<LowStockPoint> lowStockProducts,
        List<Insight> insights
) {
    public record SalesKpis(BigDecimal revenue, long orderCount, BigDecimal averageOrderValue,
                            BigDecimal previousRevenue, long previousOrderCount,
                            BigDecimal revenueChangePercent, BigDecimal averageOrderChangePercent,
                            BigDecimal sevenDayRunRate,
                            BigDecimal taxCollected, BigDecimal serviceCharge,
                            long refundsCount, BigDecimal returnedSalesAmount,
                            long voidedCount, BigDecimal voidedSalesAmount) {}

    public record ProfitSummary(BigDecimal netSalesRevenue, BigDecimal estimatedCostOfGoods, BigDecimal estimatedGrossProfit,
                                BigDecimal recordedExpenses, BigDecimal estimatedNetProfit,
                                BigDecimal costCoveragePercent, String costBasis) {}

    public record InventorySummary(BigDecimal stockValuationAtCost, long lowStockCount,
                                   BigDecimal costCoveragePercent, long unitsReceived, long unitsIssued,
                                   BigDecimal estimatedStockTurnover, String stockTurnoverLimitation) {}

    public record OperationsSummary(long tableCount, long occupiedTableCount,
                                   BigDecimal currentTableOccupancyPercent,
                                   BigDecimal averageKitchenPreparationMinutes,
                                   String tableUtilizationNote) {}

    public record CustomerSummary(long registeredCustomersAdded, long registeredCustomerCount,
                                  boolean returningCustomerMetricsAvailable, String limitation) {}

    public record DailyPoint(String day, BigDecimal revenue, long orders, BigDecimal previousRevenue) {}
    public record HourlyPoint(int hour, BigDecimal revenue, long orders) {}
    public record PaymentPoint(String method, BigDecimal revenue, long transactions) {}
    public record CategoryPoint(String category, BigDecimal revenue, long unitsSold) {}
    public record ProductPoint(Long productId, String product, String category, long unitsSold,
                               BigDecimal revenue, BigDecimal estimatedCost,
                               BigDecimal estimatedGrossProfit, BigDecimal estimatedMarginPercent) {}
    public record CashierPoint(String cashier, BigDecimal revenue, long transactions, BigDecimal averageOrderValue) {}
    public record LowStockPoint(Long productId, String product, int quantity, int threshold) {}
    public record Insight(String severity, String title, String detail) {}
}
