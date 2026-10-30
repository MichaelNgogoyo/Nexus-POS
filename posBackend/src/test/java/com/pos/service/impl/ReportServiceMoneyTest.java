package com.pos.service.impl;

import com.pos.model.Product;
import com.pos.repository.ProductRepository;
import com.pos.repository.SalesRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReportServiceMoneyTest {

    @Test
    void dashboardRevenueRemainsDecimalFromAggregateThroughResponse() {
        SalesRepository sales = mock(SalesRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        when(sales.sumRevenueSince(any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("123.45"), new BigDecimal("987.65"));
        when(sales.countSalesSince(any(LocalDateTime.class))).thenReturn(2L);
        when(sales.dailyRevenue(any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{"2026-10-29", new BigDecimal("123.45"), 2L}));
        when(sales.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(sales.topSellingProducts(any(Pageable.class)))
                .thenReturn(List.<Object[]>of(new Object[]{7L, "Tea", 2L, new BigDecimal("20.40")}));
        when(products.countByActiveTrue()).thenReturn(3L);
        when(products.findLowStockProducts()).thenReturn(List.of());

        var summary = new ReportService(sales, products).getDashboardSummary();

        assertThat(summary.todayRevenue()).isEqualByComparingTo("123.45");
        assertThat(summary.monthRevenue()).isEqualByComparingTo("987.65");
        assertThat(summary.dailyStats().get(0).revenue()).isEqualByComparingTo("123.45");
        assertThat(summary.topProducts().get(0).totalRevenue()).isEqualByComparingTo("20.40");
    }
}
