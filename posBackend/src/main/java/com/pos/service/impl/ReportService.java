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
        double todayRevenue = salesRepository.sumRevenueSince(startOfToday);
        long todayCount = salesRepository.countSalesSince(startOfToday);
        double monthRevenue = salesRepository.sumRevenueSince(startOfMonth);
        long monthCount = salesRepository.countSalesSince(startOfMonth);
        long totalProducts = productRepository.countByActiveTrue();
        long lowStockCount = productRepository.findLowStockProducts().size();

        // Daily revenue chart (last 30 days)
        List<DailyStat> dailyStats = salesRepository.dailyRevenue(thirtyDaysAgo).stream()
                .map(row -> new DailyStat(
                        row[0] != null ? row[0].toString() : "",
                        row[1] != null ? ((Number) row[1]).doubleValue() : 0.0,
                        row[2] != null ? ((Number) row[2]).longValue() : 0L
                ))
                .toList();

        // Recent 5 sales
        List<RecentSale> recentSales = salesRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(sale -> new RecentSale(
                        sale.getId(),
                        sale.getCashierId(),
                        sale.getTotalAmount(),
                        sale.getPaymentMethod(),
                        sale.getStatus() != null ? sale.getStatus().name() : "UNKNOWN",
                        sale.getCreatedAt() != null ? sale.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                        sale.getSaleItems() == null ? List.of() : sale.getSaleItems().stream()
                                .map(item -> new SaleLineItem(
                                        item.getProduct() != null ? item.getProduct().getName() : "Unknown",
                                        item.getQuantity(),
                                        item.getPrice()
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
                        row[3] != null ? ((Number) row[3]).doubleValue() : 0.0
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
}
