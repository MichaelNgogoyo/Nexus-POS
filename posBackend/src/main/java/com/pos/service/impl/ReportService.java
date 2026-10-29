package com.pos.service.impl;

import com.pos.dto.DashboardSummaryResponse;
import com.pos.dto.DashboardSummaryResponse.*;
import com.pos.model.Product;
import com.pos.repository.ProductRepository;
import com.pos.repository.SalesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final SalesRepository salesRepository;
    private final ProductRepository productRepository;

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
    public List<Product> getLowStockProducts() {
        return productRepository.findLowStockProducts();
    }

    private BigDecimal money(Object value) {
        if (value == null) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal amount = value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
