package com.pos.service.impl;

import com.pos.dto.SaleItemRequest;
import com.pos.dto.SaleRequest;
import com.pos.model.OrderType;
import com.pos.model.Sales;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import com.pos.repository.ModifierGroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesServiceIdempotencyTest {
    @Mock private SalesRepository salesRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private AuditService auditService;
    @Mock private RestaurantTableRepository tableRepository;
    @Mock private ModifierGroupRepository modifierGroupRepository;
    private SalesService service;

    @BeforeEach
    void setUp() {
        service = new SalesService(salesRepository, productRepository, stockMovementRepository, auditService, tableRepository, modifierGroupRepository);
        ReflectionTestUtils.setField(service, "taxRatePercent", 16.0);
        ReflectionTestUtils.setField(service, "serviceChargeRatePercent", 5.0);
    }

    @Test
    void repeatingAnIdempotencyKeyReturnsOriginalSaleWithoutRepeatingSideEffects() {
        SaleRequest request = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 1, null, null)), 121.0,
                OrderType.TAKEAWAY, null, null, null, null, "checkout-attempt-12345");
        Sales original = Sales.builder().id(91L).totalAmount(121.0).build();
        when(salesRepository.findByIdempotencyKey(request.idempotencyKey())).thenReturn(Optional.of(original));

        Sales result = service.createSales(request, "cashier");

        assertThat(result).isSameAs(original);
        verifyNoInteractions(productRepository, stockMovementRepository, auditService, tableRepository);
        verify(salesRepository, never()).save(any());
    }
}
