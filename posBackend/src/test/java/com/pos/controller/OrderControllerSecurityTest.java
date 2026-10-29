package com.pos.controller;

import com.pos.model.*;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.service.impl.AuditService;
import com.pos.service.RestaurantOrderService;
import com.pos.service.RestaurantOrderMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderControllerSecurityTest {
    @Mock private RestaurantOrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private RestaurantTableRepository tableRepository;
    @Mock private AuditService auditService;
    @Mock private ModifierGroupRepository modifierGroupRepository;
    @Mock private KitchenOrderRepository kitchenOrderRepository;
    private RestaurantOrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new RestaurantOrderService(orderRepository, productRepository, tableRepository, auditService,
                modifierGroupRepository, kitchenOrderRepository, new RestaurantOrderMapper());
        ReflectionTestUtils.setField(orderService, "taxRate", 10.0);
        ReflectionTestUtils.setField(orderService, "serviceChargeRate", 5.0);
        lenient().when(orderRepository.save(any(RestaurantOrder.class))).thenAnswer(call -> {
            RestaurantOrder saved = call.getArgument(0);
            if (saved.getId() == null) saved.setId(25L);
            return saved;
        });
    }

    @Test
    void createOrderUsesCatalogPricesAndServerCalculatedTotals() {
        Product product = Product.builder().id(4L).name("Breakfast plate").price(100.0).active(true).quantity(25).build();
        when(productRepository.findById(4L)).thenReturn(Optional.of(product));
        when(modifierGroupRepository.findByProductId(4L)).thenReturn(List.of());
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY, "room-charge-attempt-12345",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 2, null, List.of())));
        var cashier = new UsernamePasswordAuthenticationToken("cashier-4", "", List.of());

        RestaurantOrderService.CreateResult result = orderService.createOrder(request, cashier.getName());

        var saved = result.order();
        assertThat(result.created()).isTrue();
        assertThat(saved.status()).isEqualTo(OrderStatus.OPEN);
        assertThat(saved.cashierId()).isEqualTo("cashier-4");
        assertThat(saved.subtotal()).isEqualByComparingTo("200.00");
        assertThat(saved.taxAmount()).isEqualByComparingTo("20.00");
        assertThat(saved.serviceChargeAmount()).isEqualByComparingTo("10.00");
        assertThat(saved.total()).isEqualByComparingTo("230.00");
        assertThat(saved.items().get(0).unitPrice()).isEqualByComparingTo("100.00");
        assertThat(OrderController.class.getAnnotation(PreAuthorize.class).value())
                .contains("ADMIN", "MANAGER", "CASHIER");
    }

    @Test
    void dineInOrderRequiresARealTable() {
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.DINE_IN, "dine-in-attempt-12345",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        assertThatThrownBy(() -> orderService.createOrder(request, "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Select a table");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void roomChargeOrderIsUnavailableWithoutHotelFolioIntegration() {
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.ROOM_CHARGE, "room-charge-attempt-12345",
                null, "101", null, null, List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        assertThatThrownBy(() -> orderService.createOrder(request, "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Room charges are unavailable");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void createOrderRejectsClientQuantityOutsideAllowedBounds() {
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY, "room-charge-attempt-12345",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 0, null, List.of())));

        assertThatThrownBy(() -> orderService.createOrder(request, "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("quantity between 1 and 999");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void repeatedOrderIdempotencyKeyReturnsOriginalWithoutRepeatingWrites() {
        RestaurantOrder previous = RestaurantOrder.builder().id(25L).orderNumber("ORD-0025").cashierId("cashier-4")
                .orderType(OrderType.TAKEAWAY).items(List.of(OrderItem.builder().productId(4L).quantity(1)
                        .modifiers(List.of()).build())).build();
        when(orderRepository.findByIdempotencyKey("room-charge-attempt-12345")).thenReturn(Optional.of(previous));
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY, "room-charge-attempt-12345",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        RestaurantOrderService.CreateResult result = orderService.createOrder(request, "cashier-4");

        assertThat(result.order().id()).isEqualTo(previous.getId());
        assertThat(result.created()).isFalse();
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository, auditService);
    }

    @Test
    void orderIdempotencyReplayCannotExposeAnotherCashiersOrder() {
        RestaurantOrder previous = RestaurantOrder.builder().id(25L).orderNumber("ORD-0025").cashierId("cashier-9")
                .orderType(OrderType.TAKEAWAY).items(List.of(OrderItem.builder().productId(4L).quantity(1)
                        .modifiers(List.of()).build())).build();
        when(orderRepository.findByIdempotencyKey("room-charge-attempt-12345")).thenReturn(Optional.of(previous));
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY, "room-charge-attempt-12345",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        assertThatThrownBy(() -> orderService.createOrder(request, "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Idempotency key is already associated");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository, auditService);
    }

    @Test
    void orderIdempotencyReplayRejectsDifferentPayloadFromTheSameCashier() {
        RestaurantOrder previous = RestaurantOrder.builder().id(25L).orderNumber("ORD-0025").cashierId("cashier-4")
                .orderType(OrderType.TAKEAWAY).items(List.of(OrderItem.builder().productId(4L).quantity(1)
                        .modifiers(List.of()).build())).build();
        when(orderRepository.findByIdempotencyKey("room-charge-attempt-12345")).thenReturn(Optional.of(previous));
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY, "room-charge-attempt-12345",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 2, null, List.of())));

        assertThatThrownBy(() -> orderService.createOrder(request, "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("different operation");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository, auditService);
    }
}
