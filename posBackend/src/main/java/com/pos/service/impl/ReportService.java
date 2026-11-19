package com.pos.service.impl;

import com.pos.dto.DashboardSummaryResponse;
import com.pos.dto.DashboardSummaryResponse.*;
import com.pos.dto.AnalyticsResponse;
import com.pos.dto.AnalyticsResponse.*;
import com.pos.model.Product;
import com.pos.model.RestaurantTable;
import com.pos.repository.CustomerRepository;
import com.pos.repository.ExpenseRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Objects;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final SalesRepository salesRepository;
    private final ProductRepository productRepository;
    private final ExpenseRepository expenseRepository;
    private final StockMovementRepository stockMovementRepository;
    private final KitchenOrderRepository kitchenOrderRepository;
    private final RestaurantTableRepository restaurantTableRepository;
    private final CustomerRepository customerRepository;

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        // KPI counters
        BigDecimal todayRevenue = money(salesRepository.sumRevenueSince(startOfToday));
        long todayCount = salesRepository.countSalesSince(startOfToday);
        BigDecimal monthRevenue = money(salesRepository.sumRevenueSince(startOfMonth));
        long monthCount = salesRepository.countSalesSince(startOfMonth);
        long totalProducts = productRepository.countByActiveTrue();
        long lowStockCount = productRepository.findLowStockProducts().size();

        // Daily revenue chart (last 30 days)
        List<DailyStat> dailyStats = salesRepository.dailyRevenue(thirtyDaysAgo).stream()
                .map(row -> new DailyStat(
                        row[0] != null ? row[0].toString() : "",
                        money(row[1]),
                        row[2] != null ? ((Number) row[2]).longValue() : 0L
                ))
                .toList();

        // Recent 5 sales
        List<RecentSale> recentSales = salesRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(sale -> new RecentSale(
                        sale.getId(),
                        sale.getCashierId(),
                        money(sale.getTotalAmount()),
                        sale.getPaymentMethod(),
                        sale.getStatus() != null ? sale.getStatus().name() : "UNKNOWN",
                        sale.getCreatedAt() != null ? sale.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                        sale.getSaleItems() == null ? List.of() : sale.getSaleItems().stream()
                                .map(item -> new SaleLineItem(
                                        item.getProduct() != null ? item.getProduct().getName() : "Unknown",
                                        item.getQuantity(),
                                        money(item.getPrice())
                                ))
                                .toList()
                ))
                .toList();

        // Top 5 products by qty sold
        List<TopProduct> topProducts = salesRepository.topSellingProducts(PageRequest.of(0, 5)).stream()
                .map(row -> new TopProduct(
                        row[0] != null ? ((Number) row[0]).longValue() : 0L,
                        row[1] != null ? row[1].toString() : "Unknown",
                        row[2] != null ? ((Number) row[2]).longValue() : 0L,
                        money(row[3])
                ))
                .toList();

        return new DashboardSummaryResponse(
                todayRevenue, todayCount,
                monthRevenue, monthCount,
                totalProducts, lowStockCount,
                dailyStats, recentSales, topProducts
        );
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics(LocalDate from, LocalDate to) {
        int days = Math.toIntExact(ChronoUnit.DAYS.between(from, to) + 1);
        LocalDate previousFrom = from.minusDays(days);
        LocalDate previousTo = from.minusDays(1);
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        LocalDateTime previousStart = previousFrom.atStartOfDay();

        Object[] current = salesRepository.analyticsTotals(start, end);
        Object[] previous = salesRepository.analyticsTotals(previousStart, start);
        BigDecimal revenue = decimal(current, 0);
        long orders = integer(current, 1);
        BigDecimal previousRevenue = decimal(previous, 0);
        long previousOrders = integer(previous, 1);
        BigDecimal taxCollected = decimal(current, 2);
        BigDecimal serviceCharge = decimal(current, 3);
        BigDecimal netSalesRevenue = revenue.subtract(taxCollected).subtract(serviceCharge);
        BigDecimal averageOrder = average(revenue, orders);
        BigDecimal previousAverageOrder = average(previousRevenue, previousOrders);

        Map<LocalDate, DailyPoint> dailyByDate = new LinkedHashMap<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            dailyByDate.put(day, new DailyPoint(day.toString(), zero(), 0, zero()));
        }
        Map<LocalDate, BigDecimal> previousDaily = new LinkedHashMap<>();
        salesRepository.analyticsDaily(previousStart, start).forEach(row ->
                previousDaily.put(asDate(row[0]), decimal(row, 1)));
        salesRepository.analyticsDaily(start, end).forEach(row -> {
            LocalDate day = asDate(row[0]);
            if (dailyByDate.containsKey(day)) {
                dailyByDate.put(day, new DailyPoint(day.toString(), decimal(row, 1), integer(row, 2),
                        previousDaily.getOrDefault(day.minusDays(days), zero())));
            }
        });
        List<DailyPoint> daily = new ArrayList<>(dailyByDate.values());

        List<HourlyPoint> hourly = new ArrayList<>();
        Map<Integer, Object[]> hourlyRows = new LinkedHashMap<>();
        salesRepository.analyticsHourly(start, end).forEach(row -> hourlyRows.put((int) integer(row, 0), row));
        for (int hour = 0; hour < 24; hour++) {
            Object[] row = hourlyRows.get(hour);
            hourly.add(new HourlyPoint(hour, row == null ? zero() : decimal(row, 1), row == null ? 0 : integer(row, 2)));
        }

        List<PaymentPoint> payments = salesRepository.analyticsPayments(start, end).stream()
                .map(row -> new PaymentPoint(String.valueOf(row[0]), decimal(row, 1), integer(row, 2))).toList();
        List<CategoryPoint> categories = salesRepository.analyticsCategories(start, end).stream()
                .map(row -> new CategoryPoint(String.valueOf(row[0]), decimal(row, 1), integer(row, 2))).toList();

        List<Object[]> productRows = salesRepository.analyticsProducts(start, end);
        long soldUnits = productRows.stream().mapToLong(row -> integer(row, 3)).sum();
        long unitsWithKnownCost = productRows.stream().mapToLong(row -> {
            long units = integer(row, 3);
            long unitsMissing = integer(row, 6);
            return Math.max(0, units - unitsMissing);
        }).sum();
        BigDecimal costCoverage = percent(unitsWithKnownCost, soldUnits);
        BigDecimal estimatedCost = productRows.stream().map(row -> decimal(row, 5)).reduce(zero(), BigDecimal::add);
        BigDecimal grossProfitEstimate = soldUnits > 0 && unitsWithKnownCost == soldUnits
                ? netSalesRevenue.subtract(estimatedCost) : null;
        BigDecimal expenses = zeroIfNull(expenseRepository.sumExpensesBetween(from, to));
        BigDecimal netProfitEstimate = grossProfitEstimate == null ? null : grossProfitEstimate.subtract(expenses);
        List<ProductPoint> products = productRows.stream().map(row -> {
            BigDecimal productRevenue = decimal(row, 4);
            BigDecimal productCost = integer(row, 6) > 0 ? null : decimal(row, 5);
            BigDecimal gross = productCost == null ? null : productRevenue.subtract(productCost);
            return new ProductPoint(longValue(row[0]), String.valueOf(row[1]), String.valueOf(row[2]),
                    integer(row, 3), productRevenue, productCost, gross,
                    gross == null ? null : percent(gross, productRevenue));
        }).toList();

        List<CashierPoint> cashiers = salesRepository.analyticsCashiers(start, end).stream()
                .map(row -> new CashierPoint(String.valueOf(row[0]), decimal(row, 1), integer(row, 2),
                        average(decimal(row, 1), integer(row, 2)))).toList();

        Object[] stockTotals = productRepository.analyticsInventoryTotals();
        BigDecimal inventoryValue = decimal(stockTotals, 0);
        long inventoryUnitsWithCost = integer(stockTotals, 1);
        long inventoryUnits = integer(stockTotals, 2);
        Object[] movement = stockMovementRepository.sumMovementUnitsBetween(start, end);
        long lowStockCount = productRepository.countLowStockProducts();
        List<Product> lowStockProducts = productRepository.findLowStockProducts(PageRequest.of(0, 10));
        List<LowStockPoint> lowStock = lowStockProducts.stream()
                .map(product -> new LowStockPoint(product.getId(), product.getName(), product.getQuantity(), product.getLowStockThreshold()))
                .toList();

        Map<String, Object[]> statuses = new LinkedHashMap<>();
        salesRepository.analyticsStatuses(start, end).forEach(row -> statuses.put(String.valueOf(row[0]), row));
        Object[] returned = statuses.get("RETURNED");
        Object[] voided = statuses.get("VOIDED");
        BigDecimal runRate = daily.stream().skip(Math.max(0, daily.size() - 7L)).map(DailyPoint::revenue)
                .reduce(zero(), BigDecimal::add).divide(BigDecimal.valueOf(Math.min(7, daily.size())), 2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(7)).setScale(2, RoundingMode.HALF_UP);

        List<Object[]> kitchenDurations = kitchenOrderRepository.completedDurationsBetween(start, end);
        BigDecimal averageKitchenMinutes = kitchenDurations.stream().map(row -> {
            if (row[0] == null || row[1] == null) return null;
            return BigDecimal.valueOf(Duration.between((LocalDateTime) row[0], (LocalDateTime) row[1]).toSeconds())
                    .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }).filter(Objects::nonNull).reduce(zero(), BigDecimal::add);
        if (!kitchenDurations.isEmpty()) {
            averageKitchenMinutes = averageKitchenMinutes.divide(BigDecimal.valueOf(kitchenDurations.size()), 2, RoundingMode.HALF_UP);
        } else {
            averageKitchenMinutes = null;
        }

        List<RestaurantTable> tables = restaurantTableRepository.findAll();
        long occupiedTables = tables.stream().filter(table -> table.getStatus() != null
                && table.getStatus().name().equals("OCCUPIED")).count();
        List<Insight> insights = buildInsights(revenue, previousRevenue, categories, products, lowStockCount, expenses, daily);
        return new AnalyticsResponse(from.toString(), to.toString(), previousFrom.toString(), previousTo.toString(),
                new SalesKpis(revenue, orders, averageOrder, previousRevenue, previousOrders,
                        changePercent(revenue, previousRevenue), changePercent(averageOrder, previousAverageOrder),
                        runRate, decimal(current, 2), decimal(current, 3),
                        returned == null ? 0 : integer(returned, 1), returned == null ? zero() : decimal(returned, 2),
                        voided == null ? 0 : integer(voided, 1), voided == null ? zero() : decimal(voided, 2)),
                new ProfitSummary(netSalesRevenue, estimatedCost, grossProfitEstimate, expenses, netProfitEstimate,
                        costCoverage, "Uses current product cost; historical cost snapshots are not stored."),
                new InventorySummary(inventoryValue, lowStockCount, percent(inventoryUnitsWithCost, inventoryUnits),
                        integer(movement, 0), integer(movement, 1), null,
                        "Accurate turnover needs historical inventory valuation snapshots; the current schema stores movement deltas and current stock only."),
                new OperationsSummary(tables.size(), occupiedTables, percent(occupiedTables, tables.size()),
                        averageKitchenMinutes, "Current occupancy snapshot only; historical table occupancy is not retained."),
                new CustomerSummary(customerRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(start, end),
                        customerRepository.count(), false,
                        "Sales are not linked to customer records, so returning-customer frequency and spend cannot be calculated reliably."),
                daily, hourly, payments, categories, products, cashiers, lowStock, insights);
    }

    @Transactional(readOnly = true)
    public List<Product> getLowStockProducts() {
        return productRepository.findLowStockProducts();
    }

    private BigDecimal money(Object value) {
        if (value == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal amount = value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private List<Insight> buildInsights(BigDecimal revenue, BigDecimal previousRevenue, List<CategoryPoint> categories,
                                        List<ProductPoint> products, long lowStockCount, BigDecimal expenses,
                                        List<DailyPoint> daily) {
        List<Insight> insights = new ArrayList<>();
        if (revenue.signum() == 0) {
            insights.add(new Insight("info", "No completed sales in this period", "Complete and record sales to populate revenue, payment, and product analytics."));
        } else if (previousRevenue.signum() > 0) {
            BigDecimal change = changePercent(revenue, previousRevenue);
            if (change.compareTo(BigDecimal.valueOf(-10)) <= 0) {
                insights.add(new Insight("warning", "Revenue is below the comparison period", "Completed revenue is down " + change.abs().setScale(1, RoundingMode.HALF_UP) + "% versus the previous period."));
            } else if (change.compareTo(BigDecimal.TEN) >= 0) {
                insights.add(new Insight("positive", "Revenue is growing", "Completed revenue is up " + change.setScale(1, RoundingMode.HALF_UP) + "% versus the previous period."));
            }
        }
        if (lowStockCount > 0) insights.add(new Insight("warning", "Review low-stock items", lowStockCount + " active products are at or below their configured stock threshold."));
        if (revenue.signum() > 0 && expenses.compareTo(revenue.multiply(new BigDecimal("0.5"))) > 0) {
            insights.add(new Insight("warning", "Recorded expenses are high relative to sales", "Recorded expenses exceed half of completed sales revenue for this period. Review expense entries and operating costs."));
        }
        if (!categories.isEmpty()) {
            CategoryPoint top = categories.get(0);
            if (top.revenue().compareTo(revenue.multiply(new BigDecimal("0.5"))) >= 0) {
                insights.add(new Insight("info", "Revenue is concentrated in one category", top.category() + " contributes at least half of completed sales revenue in the selected period."));
            }
        }
        if (daily.size() >= 7) {
            double[] values = daily.stream().mapToDouble(point -> point.revenue().doubleValue()).toArray();
            double mean = java.util.Arrays.stream(values).average().orElse(0);
            double variance = java.util.Arrays.stream(values).map(value -> Math.pow(value - mean, 2)).average().orElse(0);
            double standardDeviation = Math.sqrt(variance);
            DailyPoint latest = daily.get(daily.size() - 1);
            if (standardDeviation > 0 && Math.abs(latest.revenue().doubleValue() - mean) >= standardDeviation * 2) {
                insights.add(new Insight("warning", "Daily revenue outlier", latest.day() + " differs from the period daily average by at least two standard deviations. Check for unusual trading or data entry."));
            }
        }
        if (insights.isEmpty()) insights.add(new Insight("positive", "No threshold alerts detected", "No revenue, expense, category concentration, or stock alert crossed the current insight thresholds."));
        return insights;
    }

    private BigDecimal decimal(Object[] row, int index) { return zeroIfNull(projectedValue(row, index)); }
    private long integer(Object[] row, int index) { return longValue(projectedValue(row, index)); }
    private Object projectedValue(Object[] row, int index) {
        Object[] values = row;
        while (values != null && values.length == 1 && values[0] instanceof Object[] nested) values = nested;
        return values == null || values.length <= index ? null : values[index];
    }
    private long longValue(Object value) { return value == null ? 0 : ((Number) value).longValue(); }
    private LocalDate asDate(Object value) { return value instanceof LocalDate date ? date : LocalDate.parse(value.toString()); }
    private BigDecimal average(BigDecimal amount, long count) { return count == 0 ? zero() : amount.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP); }
    private BigDecimal changePercent(BigDecimal current, BigDecimal previous) {
        return previous.signum() == 0 ? null : current.subtract(previous).multiply(BigDecimal.valueOf(100))
                .divide(previous.abs(), 2, RoundingMode.HALF_UP);
    }
    private BigDecimal percent(long numerator, long denominator) {
        return denominator == 0 ? zero() : BigDecimal.valueOf(numerator).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }
    private BigDecimal percent(BigDecimal numerator, BigDecimal denominator) {
        return denominator.signum() == 0 ? zero() : numerator.multiply(BigDecimal.valueOf(100))
                .divide(denominator, 2, RoundingMode.HALF_UP);
    }
    private BigDecimal zero() { return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP); }
    private BigDecimal zeroIfNull(BigDecimal value) { return value == null ? zero() : value.setScale(2, RoundingMode.HALF_UP); }
    private BigDecimal zeroIfNull(Object value) {
        if (value == null) return zero();
        if (value instanceof BigDecimal decimal) return zeroIfNull(decimal);
        if (value instanceof Number number) return new BigDecimal(number.toString()).setScale(2, RoundingMode.HALF_UP);
        if (value instanceof CharSequence text) return new BigDecimal(text.toString()).setScale(2, RoundingMode.HALF_UP);
        throw new IllegalArgumentException("Unsupported numeric aggregate type: " + value.getClass().getName());
    }
}
