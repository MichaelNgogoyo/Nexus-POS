package com.pos.controller;

import com.pos.model.*;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
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
    private OrderController controller;

    @BeforeEach
    void setUp() {
        controller = new OrderController(orderRepository, productRepository, tableRepository, auditService, modifierGroupRepository);
        ReflectionTestUtils.setField(controller, "taxRate", 10.0);
        ReflectionTestUtils.setField(controller, "serviceChargeRate", 5.0);
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
        OrderItem clientLine = OrderItem.builder().productId(4L).quantity(2)
                .unitPrice(new BigDecimal("0.01")).lineTotal(new BigDecimal("0.02")).build();
        RestaurantOrder request = RestaurantOrder.builder().orderType(OrderType.ROOM_CHARGE).roomNumber("312")
                .status(OrderStatus.PAID).subtotal(new BigDecimal("0.02")).total(new BigDecimal("0.02"))
                .idempotencyKey("room-charge-attempt-12345")
                .items(List.of(clientLine)).build();
        var cashier = new UsernamePasswordAuthenticationToken("cashier-4", "", List.of());

        ResponseEntity<RestaurantOrder> response = controller.createOrder(request, cashier);

        RestaurantOrder saved = response.getBody();
        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(saved).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(OrderStatus.OPEN);
        assertThat(saved.getCashierId()).isEqualTo("cashier-4");
        assertThat(saved.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(saved.getTaxAmount()).isEqualByComparingTo("20.00");
        assertThat(saved.getServiceChargeAmount()).isEqualByComparingTo("10.00");
        assertThat(saved.getTotal()).isEqualByComparingTo("230.00");
        assertThat(saved.getItems().get(0).getUnitPrice()).isEqualByComparingTo("100.00");
        assertThat(OrderController.class.getAnnotation(PreAuthorize.class).value())
                .contains("ADMIN", "MANAGER", "CASHIER");
    }

    @Test
    void dineInOrderRequiresARealTable() {
        RestaurantOrder request = RestaurantOrder.builder().orderType(OrderType.DINE_IN)
                .idempotencyKey("dine-in-attempt-12345").items(List.of(OrderItem.builder().productId(4L).quantity(1).build())).build();

        assertThatThrownBy(() -> controller.createOrder(request,
                new UsernamePasswordAuthenticationToken("cashier-4", "", List.of())))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Select a table");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void roomChargeOrderRequiresRoomNumber() {
        RestaurantOrder request = RestaurantOrder.builder().orderType(OrderType.ROOM_CHARGE)
                .idempotencyKey("room-charge-attempt-12345").items(List.of(OrderItem.builder().productId(4L).quantity(1).build())).build();

        assertThatThrownBy(() -> controller.createOrder(request,
                new UsernamePasswordAuthenticationToken("cashier-4", "", List.of())))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Room number is required");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void createOrderRejectsClientQuantityOutsideAllowedBounds() {
        RestaurantOrder request = RestaurantOrder.builder().orderType(OrderType.ROOM_CHARGE).roomNumber("312")
                .idempotencyKey("room-charge-attempt-12345")
                .items(List.of(OrderItem.builder().productId(4L).quantity(0).build())).build();

        assertThatThrownBy(() -> controller.createOrder(request,
                new UsernamePasswordAuthenticationToken("cashier-4", "", List.of())))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("quantity between 1 and 999");
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void repeatedOrderIdempotencyKeyReturnsOriginalWithoutRepeatingWrites() {
        RestaurantOrder previous = RestaurantOrder.builder().id(25L).orderNumber("ORD-0025").build();
        when(orderRepository.findByIdempotencyKey("room-charge-attempt-12345")).thenReturn(Optional.of(previous));
        RestaurantOrder request = RestaurantOrder.builder().orderType(OrderType.ROOM_CHARGE).roomNumber("312")
                .idempotencyKey("room-charge-attempt-12345").items(List.of(OrderItem.builder().productId(4L).quantity(1).build())).build();

        ResponseEntity<RestaurantOrder> response = controller.createOrder(request,
                new UsernamePasswordAuthenticationToken("cashier-4", "", List.of()));

        assertThat(response.getBody()).isSameAs(previous);
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(productRepository, auditService);
    }
}
