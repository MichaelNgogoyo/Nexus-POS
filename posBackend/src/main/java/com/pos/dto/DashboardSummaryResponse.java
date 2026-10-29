package com.pos.dto;

import java.util.List;
import java.math.BigDecimal;

/**
 * Aggregated dashboard data returned by GET /api/report/summary.
 * All monetary values are in the shop's base currency.
 */
public record DashboardSummaryResponse(

        /** Total revenue from completed sales today */
        BigDecimal todayRevenue,

        /** Number of completed sales today */
        long todaySalesCount,

        /** Total revenue from completed sales this month */
        BigDecimal monthRevenue,

        /** Number of completed sales this month */
        long monthSalesCount,

        /** Total number of products in the system */
        long totalProducts,

        /** Number of products at or below their low-stock threshold */
        long lowStockCount,

        /** Daily revenue data for the past 30 days (for charts) */
        List<DailyStat> dailyStats,

        /** Last 5 completed sales (for the recent-orders table) */
        List<RecentSale> recentSales,

        /** Top 5 products by quantity sold all-time */
        List<TopProduct> topProducts
) {

    public record DailyStat(String day, BigDecimal revenue, long salesCount) {}

    public record RecentSale(Long id, String cashierId, BigDecimal totalAmount,
                             String paymentMethod, String status, String createdAt,
                             List<SaleLineItem> items) {}

    public record SaleLineItem(String productName, int quantity, BigDecimal price) {}

    public record TopProduct(Long productId, String productName, long totalQty, BigDecimal totalRevenue) {}
}
