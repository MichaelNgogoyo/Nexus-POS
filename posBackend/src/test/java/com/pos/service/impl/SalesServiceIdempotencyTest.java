package com.pos.service.impl;

import com.pos.dto.SaleItemRequest;
import com.pos.dto.SaleRequest;
import com.pos.dto.OrderPaymentRequest;
import com.pos.model.OrderType;
import com.pos.model.SaleItem;
import com.pos.model.Sales;
import com.pos.model.RestaurantOrder;
import com.pos.model.OrderItem;
import com.pos.model.OrderStatus;
import java.math.BigDecimal;
import com.pos.model.Product;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.model.KitchenOrder;
import com.pos.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesServiceIdempotencyTest {
    @Mock private SalesRepository salesRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private AuditService auditService;
    @Mock private RestaurantTableRepository tableRepository;
    @Mock private ModifierGroupRepository modifierGroupRepository;
    @Mock private RestaurantOrderRepository orderRepository;
    @Mock private KitchenOrderRepository kitchenOrderRepository;
    private SalesService service;

    @BeforeEach
    void setUp() {
        service = new SalesService(salesRepository, productRepository, stockMovementRepository, auditService, tableRepository, modifierGroupRepository, orderRepository, kitchenOrderRepository);
        ReflectionTestUtils.setField(service, "taxRatePercent", 16.0);
        ReflectionTestUtils.setField(service, "serviceChargeRatePercent", 5.0);
    }

    @Test
    void repeatingAnIdempotencyKeyReturnsOriginalSaleWithoutRepeatingSideEffects() {
        SaleRequest request = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 1, null, null)), 121.0,
                OrderType.TAKEAWAY, null, null, null, null, "checkout-attempt-12345");
        Sales original = Sales.builder().id(91L).cashierId("cashier").paymentMethod("CASH")
                .orderType(OrderType.TAKEAWAY).amountTendered(121.0).totalAmount(121.0)
                .saleItems(List.of(SaleItem.builder().product(Product.builder().id(3L).build()).quantity(1)
                        .modifiers(List.of()).build())).build();
        when(salesRepository.findByIdempotencyKey(request.idempotencyKey())).thenReturn(Optional.of(original));

        Sales result = service.createSales(request, "cashier");

        assertThat(result).isSameAs(original);
        verifyNoInteractions(productRepository, stockMovementRepository, auditService, tableRepository);
        verifyNoInteractions(orderRepository, kitchenOrderRepository);
        verify(salesRepository, never()).save(any());
    }

    @Test
    void cashSettlementUsesSavedOrderTotalsAndDoesNotDecrementStockAgain() {
        Product product = Product.builder().id(4L).name("Breakfast plate").price(120.0).active(true).quantity(8).build();
        OrderItem item = OrderItem.builder().productId(4L).productName("Breakfast plate")
                .unitPrice(new BigDecimal("100.00")).quantity(1).lineTotal(new BigDecimal("100.00")).build();
        RestaurantOrder order = RestaurantOrder.builder().id(25L).orderNumber("ORD-25").orderType(OrderType.TAKEAWAY)
                .status(OrderStatus.READY).cashierId("waiter").items(new java.util.ArrayList<>(List.of(item)))
                .subtotal(new BigDecimal("100.00")).taxAmount(new BigDecimal("10.00"))
                .serviceChargeAmount(new BigDecimal("5.00")).discountAmount(BigDecimal.ZERO)
                .total(new BigDecimal("115.00")).build();
        when(salesRepository.findByIdempotencyKey("payment-request-123456")).thenReturn(Optional.empty());
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));
        when(salesRepository.findByRestaurantOrderId(25L)).thenReturn(Optional.empty());
        when(productRepository.findAllById(List.of(4L))).thenReturn(List.of(product));
        when(salesRepository.saveAndFlush(any(Sales.class))).thenAnswer(invocation -> {
            Sales saved = invocation.getArgument(0);
            saved.setId(88L);
            return saved;
        });

        Sales sale = service.settleOrderCash(25L,
                new OrderPaymentRequest(new BigDecimal("120.00"), "payment-request-123456"), "cashier");

        assertThat(sale.getId()).isEqualTo(88L);
        assertThat(sale.getRestaurantOrderId()).isEqualTo(25L);
        assertThat(sale.getSubtotalAmount()).isEqualTo(100.0);
        assertThat(sale.getTaxAmount()).isEqualTo(10.0);
        assertThat(sale.getServiceChargeAmount()).isEqualTo(5.0);
        assertThat(sale.getTotalAmount()).isEqualTo(115.0);
        assertThat(sale.getAmountTendered()).isEqualTo(120.0);
        assertThat(sale.getChangeGiven()).isEqualTo(5.0);
        assertThat(sale.getSaleItems()).hasSize(1);
        assertThat(sale.getSaleItems().get(0).getPrice()).isEqualTo(100.0);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getSaleId()).isEqualTo(88L);
        verify(productRepository, never()).saveAll(any());
        verifyNoInteractions(stockMovementRepository);
        verify(auditService).log("cashier", "ORDER_PAYMENT_RECORDED", "RestaurantOrder", "25",
                "READY", "PAID sale=88; amount=115.00; method=CASH");
    }

    @Test
    void cashSettlementRejectsInsufficientTenderBeforeSaving() {
        OrderItem item = OrderItem.builder().productId(4L).unitPrice(new BigDecimal("100.00"))
                .quantity(1).lineTotal(new BigDecimal("100.00")).build();
        RestaurantOrder order = RestaurantOrder.builder().id(25L).status(OrderStatus.KITCHEN)
                .items(new java.util.ArrayList<>(List.of(item))).subtotal(new BigDecimal("100.00"))
                .taxAmount(BigDecimal.ZERO).serviceChargeAmount(BigDecimal.ZERO).discountAmount(BigDecimal.ZERO)
                .total(new BigDecimal("100.00")).build();
        when(salesRepository.findByIdempotencyKey("payment-request-123456")).thenReturn(Optional.empty());
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));
        when(salesRepository.findByRestaurantOrderId(25L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.settleOrderCash(25L,
                new OrderPaymentRequest(new BigDecimal("99.99"), "payment-request-123456"), "cashier"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("less than the amount due");
        verify(salesRepository, never()).save(any());
        verify(productRepository, never()).findAllById(any());
    }

    @Test
    void cashSettlementReplaysOnlyForTheSameCashierOrderAndAmount() {
        Sales previous = Sales.builder().id(88L).cashierId("cashier").restaurantOrderId(25L)
                .paymentMethod("CASH").amountTendered(120.0).totalAmount(115.0).build();
        when(salesRepository.findByIdempotencyKey("payment-request-123456")).thenReturn(Optional.of(previous));

        Sales replay = service.settleOrderCash(25L,
                new OrderPaymentRequest(new BigDecimal("120.00"), "payment-request-123456"), "cashier");

        assertThat(replay).isSameAs(previous);
        verify(orderRepository, never()).findByIdForUpdate(any());
        verify(salesRepository, never()).save(any());
    }

    @Test
    void cashSettlementReplayCannotExposeAnotherCashiersSale() {
        Sales previous = Sales.builder().id(88L).cashierId("cashier-2").restaurantOrderId(25L)
                .paymentMethod("CASH").amountTendered(120.0).totalAmount(115.0).build();
        when(salesRepository.findByIdempotencyKey("payment-request-123456")).thenReturn(Optional.of(previous));

        assertThatThrownBy(() -> service.settleOrderCash(25L,
                new OrderPaymentRequest(new BigDecimal("120.00"), "payment-request-123456"), "cashier"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("different operation");
        verify(orderRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void idempotencyReplayCannotExposeAnotherCashiersSale() {
        SaleRequest request = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 1, null, null)), 121.0,
                OrderType.TAKEAWAY, null, null, null, null, "checkout-attempt-12345");
        Sales original = Sales.builder().id(91L).cashierId("different-cashier").totalAmount(121.0).build();
        when(salesRepository.findByIdempotencyKey(request.idempotencyKey())).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.createSales(request, "cashier"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Idempotency key is already associated");
        verifyNoInteractions(productRepository, stockMovementRepository, auditService, tableRepository,
                orderRepository, kitchenOrderRepository);
        verify(salesRepository, never()).save(any());
    }

    @Test
    void idempotencyReplayRejectsDifferentPayloadFromTheSameCashier() {
        SaleRequest originalRequest = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 1, null, null)), 121.0,
                OrderType.TAKEAWAY, null, null, null, null, "checkout-attempt-12345");
        Sales original = Sales.builder().id(91L).cashierId("cashier").paymentMethod("CASH")
                .orderType(OrderType.TAKEAWAY).amountTendered(121.0).totalAmount(121.0)
                .saleItems(List.of(SaleItem.builder().product(Product.builder().id(3L).build()).quantity(1)
                        .modifiers(List.of()).build())).build();
        when(salesRepository.findByIdempotencyKey(originalRequest.idempotencyKey())).thenReturn(Optional.of(original));
        SaleRequest differentPayload = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 2, null, null)), 121.0,
                OrderType.TAKEAWAY, null, null, null, null, originalRequest.idempotencyKey());

        assertThatThrownBy(() -> service.createSales(differentPayload, "cashier"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("different operation");
        verifyNoInteractions(productRepository, stockMovementRepository, auditService, tableRepository,
                orderRepository, kitchenOrderRepository);
        verify(salesRepository, never()).save(any());
    }

    @Test
    void successfulCashSaleCreatesLinkedOrderAndKitchenTicketWithServerPrices() {
        Product product = Product.builder().id(3L).name("Soup").price(55.55).quantity(5).active(true).build();
        SaleRequest request = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 2, null, "No cream")), 200.0,
                OrderType.TAKEAWAY, null, null, null, "Table takeaway", "cashier-attempt-12345");
        when(salesRepository.findByIdempotencyKey(request.idempotencyKey())).thenReturn(Optional.empty());
        when(productRepository.findAllByIdForUpdate(List.of(3L))).thenReturn(List.of(product));
        when(modifierGroupRepository.findByProductId(3L)).thenReturn(List.of());
        when(orderRepository.save(any())).thenAnswer(call -> {
            com.pos.model.RestaurantOrder order = call.getArgument(0);
            order.setId(501L);
            order.setOrderNumber("ORD-0501");
            return order;
        });
        when(salesRepository.save(any(Sales.class))).thenAnswer(call -> {
            Sales sale = call.getArgument(0);
            sale.setId(91L);
            return sale;
        });

        Sales saved = service.createSales(request, "cashier-subject");

        assertThat(saved.getSubtotalAmount()).isEqualTo(111.10);
        assertThat(saved.getTotalAmount()).isEqualTo(134.44);
        assertThat(saved.getRestaurantOrderId()).isEqualTo(501L);
        assertThat(saved.getOrderNumber()).isEqualTo("ORD-0501");
        ArgumentCaptor<com.pos.model.RestaurantOrder> orderCaptor = ArgumentCaptor.forClass(com.pos.model.RestaurantOrder.class);
        verify(orderRepository, times(2)).save(orderCaptor.capture());
        assertThat(orderCaptor.getAllValues().get(0).getItems()).hasSize(1);
        assertThat(orderCaptor.getAllValues().get(0).getItems().get(0).getProductName()).isEqualTo("Soup");
        assertThat(orderCaptor.getAllValues().get(0).getItems().get(0).getNotes()).isEqualTo("No cream");
        assertThat(orderCaptor.getAllValues().get(0).getItems().get(0).getUnitPrice()).isEqualByComparingTo("55.55");
        assertThat(orderCaptor.getAllValues().get(1).getSaleId()).isEqualTo(91L);
        verify(kitchenOrderRepository).save(argThat((KitchenOrder ticket) -> ticket.getOrder().getId().equals(501L)
                && ticket.getOrder().getItems().get(0).getKitchenStatus() == com.pos.model.KitchenStatus.PENDING));
    }

    @Test
    void insufficientCashDoesNotPersistStockOrderOrSale() {
        Product product = Product.builder().id(3L).name("Soup").price(55.55).quantity(5).active(true).build();
        SaleRequest request = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 2, null, null)), 100.0,
                OrderType.TAKEAWAY, null, null, null, null, "cashier-attempt-12345");
        when(salesRepository.findByIdempotencyKey(request.idempotencyKey())).thenReturn(Optional.empty());
        when(productRepository.findAllByIdForUpdate(List.of(3L))).thenReturn(List.of(product));
        when(modifierGroupRepository.findByProductId(3L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.createSales(request, "cashier-subject"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("is less than total");
        verify(productRepository, never()).saveAll(any());
        verify(stockMovementRepository, never()).saveAll(any());
        verifyNoInteractions(orderRepository, kitchenOrderRepository, auditService);
        verify(salesRepository, never()).save(any());
    }

    @Test
    void cashSaleRequiresExplicitTenderedAmount() {
        SaleRequest request = new SaleRequest("cashier", "CASH", List.of(new SaleItemRequest(3L, 1, null, null)), null,
                OrderType.TAKEAWAY, null, null, null, null, "cashier-attempt-12345");
        when(salesRepository.findByIdempotencyKey(request.idempotencyKey())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createSales(request, "cashier-subject"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Cash amount tendered is required");
        verifyNoInteractions(productRepository, orderRepository, kitchenOrderRepository, auditService);
        verify(salesRepository, never()).save(any());
    }
}
