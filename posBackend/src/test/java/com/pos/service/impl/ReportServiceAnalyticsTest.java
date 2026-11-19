package com.pos.service.impl;

import com.pos.repository.CustomerRepository;
import com.pos.repository.ExpenseRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReportServiceAnalyticsTest {

    @Test
    void analyticsUsesPersistedAggregatesAndExcludesTaxAndServiceFromGrossProfit() {
        SalesRepository sales = mock(SalesRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        ExpenseRepository expenses = mock(ExpenseRepository.class);
        StockMovementRepository movements = mock(StockMovementRepository.class);
        KitchenOrderRepository kitchen = mock(KitchenOrderRepository.class);
        RestaurantTableRepository tables = mock(RestaurantTableRepository.class);
        CustomerRepository customers = mock(CustomerRepository.class);

        when(sales.analyticsTotals(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new Object[]{new BigDecimal("120.00"), 1L, new BigDecimal("10.00"), new BigDecimal("5.00")})
                .thenReturn(new Object[]{new BigDecimal("100.00"), 1L, new BigDecimal("8.00"), new BigDecimal("4.00")});
        when(sales.analyticsDaily(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{LocalDate.of(2025, 12, 31), new BigDecimal("100.00"), 1L}))
                .thenReturn(List.<Object[]>of(new Object[]{LocalDate.of(2026, 1, 1), new BigDecimal("120.00"), 1L}));
        when(sales.analyticsHourly(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{12, new BigDecimal("120.00"), 1L}));
        when(sales.analyticsPayments(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{"CASH", new BigDecimal("120.00"), 1L}));
        when(sales.analyticsCategories(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{"Uncategorized", new BigDecimal("105.00"), 1L}));
        when(sales.analyticsProducts(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{1L, "Tea", "Uncategorized", 1L,
                        new BigDecimal("105.00"), new BigDecimal("25.00"), 0L}));
        when(sales.analyticsCashiers(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{"cashier-1", new BigDecimal("120.00"), 1L}));
        when(sales.analyticsStatuses(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{"RETURNED", 1L, new BigDecimal("30.00")}));
        when(expenses.sumExpensesBetween(any(LocalDate.class), any(LocalDate.class))).thenReturn(new BigDecimal("10.00"));
        when(movements.sumMovementUnitsBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new Object[]{3L, 2L});
        when(kitchen.completedDurationsBetween(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(tables.findAll()).thenReturn(List.of());
        when(products.analyticsInventoryTotals()).thenReturn(new Object[]{new BigDecimal("100.00"), 4L, 4L});
        when(products.countLowStockProducts()).thenReturn(0L);
        when(products.findLowStockProducts(any(Pageable.class))).thenReturn(List.of());
        when(customers.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(2L);
        when(customers.count()).thenReturn(7L);

        var result = new ReportService(sales, products, expenses, movements, kitchen, tables, customers)
                .getAnalytics(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 1));

        assertThat(result.sales().revenue()).isEqualByComparingTo("120.00");
        assertThat(result.sales().revenueChangePercent()).isEqualByComparingTo("20.00");
        assertThat(result.profit().netSalesRevenue()).isEqualByComparingTo("105.00");
        assertThat(result.profit().estimatedGrossProfit()).isEqualByComparingTo("80.00");
        assertThat(result.profit().estimatedNetProfit()).isEqualByComparingTo("70.00");
        assertThat(result.sales().taxCollected()).isEqualByComparingTo("10.00");
        assertThat(result.sales().serviceCharge()).isEqualByComparingTo("5.00");
        assertThat(result.customers().registeredCustomersAdded()).isEqualTo(2);
        assertThat(result.daily()).hasSize(1);
        assertThat(result.hourly()).hasSize(24);
        assertThat(result.products()).hasSize(1);
    }

    @Test
    void profitIsUnavailableWhenAnySoldUnitHasNoCurrentCost() {
        SalesRepository sales = mock(SalesRepository.class);
        ProductRepository products = mock(ProductRepository.class);
        ExpenseRepository expenses = mock(ExpenseRepository.class);
        StockMovementRepository movements = mock(StockMovementRepository.class);
        KitchenOrderRepository kitchen = mock(KitchenOrderRepository.class);
        RestaurantTableRepository tables = mock(RestaurantTableRepository.class);
        CustomerRepository customers = mock(CustomerRepository.class);
        when(sales.analyticsTotals(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new Object[]{new BigDecimal("40.00"), 1L, BigDecimal.ZERO, BigDecimal.ZERO});
        when(sales.analyticsDaily(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(sales.analyticsHourly(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(sales.analyticsPayments(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(sales.analyticsCategories(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(sales.analyticsProducts(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.<Object[]>of(new Object[]{2L, "Unknown cost", "Uncategorized", 1L,
                        new BigDecimal("40.00"), BigDecimal.ZERO, 1L}));
        when(sales.analyticsCashiers(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(sales.analyticsStatuses(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(expenses.sumExpensesBetween(any(LocalDate.class), any(LocalDate.class))).thenReturn(BigDecimal.ZERO);
        when(movements.sumMovementUnitsBetween(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(new Object[]{0L, 0L});
        when(kitchen.completedDurationsBetween(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(List.of());
        when(tables.findAll()).thenReturn(List.of());
        when(products.analyticsInventoryTotals()).thenReturn(new Object[]{BigDecimal.ZERO, 0L, 0L});
        when(products.countLowStockProducts()).thenReturn(0L);
        when(products.findLowStockProducts(any(Pageable.class))).thenReturn(List.of());
        when(customers.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(0L);
        when(customers.count()).thenReturn(0L);

        var result = new ReportService(sales, products, expenses, movements, kitchen, tables, customers)
                .getAnalytics(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 1));

        assertThat(result.profit().estimatedGrossProfit()).isNull();
        assertThat(result.profit().estimatedNetProfit()).isNull();
    }
}
