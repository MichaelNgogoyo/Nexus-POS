package com.pos.controller;

import com.pos.model.*;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.StockMovementRepository;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

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
    @Mock private StockMovementRepository stockMovementRepository;
    private RestaurantOrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new RestaurantOrderService(orderRepository, productRepository, tableRepository, auditService,
                modifierGroupRepository, kitchenOrderRepository, stockMovementRepository, new RestaurantOrderMapper());
        ReflectionTestUtils.setField(orderService, "taxRate", new BigDecimal("10.00"));
        ReflectionTestUtils.setField(orderService, "serviceChargeRate", new BigDecimal("5.00"));
        lenient().when(orderRepository.save(any(RestaurantOrder.class))).thenAnswer(call -> {
            RestaurantOrder saved = call.getArgument(0);
            if (saved.getId() == null) saved.setId(25L);
            return saved;
        });
    }

    @Test
    void createOrderUsesCatalogPricesAndServerCalculatedTotals() {
        Product product = Product.builder().id(4L).name("Breakfast plate").price(new BigDecimal("100.00")).active(true).quantity(25).build();
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
    void cashierActiveOrdersAreFilteredByIdentityInTheRepositoryQuery() {
        when(orderRepository.findByCashierIdIn(eq(java.util.Set.of("cashier-4", "kc-subject-4")), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        assertThat(orderService.getActiveOrders(java.util.Set.of("cashier-4", "kc-subject-4"), false)).isEmpty();

        verify(orderRepository).findByCashierIdIn(eq(java.util.Set.of("cashier-4", "kc-subject-4")), any(Pageable.class));
        verify(orderRepository, never()).findAll(any(Pageable.class));
    }

    @Test
    void submittingOrderToKitchenConsumesStockOnceAndCreatesMovement() {
        Product product = Product.builder().id(4L).name("Breakfast plate").price(new BigDecimal("100.00")).active(true).quantity(5).build();
        RestaurantOrder order = RestaurantOrder.builder().id(25L).orderNumber("ORD-25").cashierId("cashier-4").status(OrderStatus.OPEN)
                .items(new java.util.ArrayList<>(List.of(OrderItem.builder().productId(4L).quantity(2).build()))).build();
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));
        when(productRepository.findAllByIdForUpdate(List.of(4L))).thenReturn(List.of(product));
        when(kitchenOrderRepository.findByOrder_Id(25L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(RestaurantOrder.class))).thenAnswer(call -> call.getArgument(0));

        var result = orderService.submitToKitchen(25L, "KITCHEN", "cashier-4");

        assertThat(result.status()).isEqualTo(OrderStatus.KITCHEN);
        assertThat(product.getQuantity()).isEqualTo(3);
        verify(productRepository).saveAll(List.of(product));
        verify(stockMovementRepository).saveAll(argThat(movements -> {
            var iterator = movements.iterator();
            if (!iterator.hasNext()) return false;
            var movement = iterator.next();
            return !iterator.hasNext() && movement.getDelta() == -2 && movement.getBalanceAfter() == 3;
        }));
        verify(kitchenOrderRepository).save(any(KitchenOrder.class));
    }

    @Test
    void submittingOrderRejectsInsufficientStockWithoutKitchenTicket() {
        Product product = Product.builder().id(4L).name("Breakfast plate").price(new BigDecimal("100.00")).active(true).quantity(1).build();
        RestaurantOrder order = RestaurantOrder.builder().id(25L).cashierId("cashier-4").status(OrderStatus.OPEN)
                .items(new java.util.ArrayList<>(List.of(OrderItem.builder().productId(4L).quantity(2).build()))).build();
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));
        when(productRepository.findAllByIdForUpdate(List.of(4L))).thenReturn(List.of(product));

        assertThatThrownBy(() -> orderService.submitToKitchen(25L, "KITCHEN", "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Insufficient stock");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.OPEN);
        verify(kitchenOrderRepository, never()).save(any());
        verifyNoInteractions(stockMovementRepository);
    }

    @Test
    void retryingAlreadySubmittedOrderDoesNotConsumeStockTwice() {
        RestaurantOrder previous = RestaurantOrder.builder().id(25L).orderNumber("ORD-25").cashierId("cashier-4")
                .orderType(OrderType.TAKEAWAY).status(OrderStatus.KITCHEN)
                .items(List.of(OrderItem.builder().productId(4L).quantity(2).modifiers(List.of()).build())).build();
        when(orderRepository.findByIdempotencyKey("takeaway-order-request-1234")).thenReturn(Optional.of(previous));
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY, "takeaway-order-request-1234",
                null, null, null, null, List.of(new RestaurantOrderItemRequest(4L, 2, null, List.of())));

        RestaurantOrderService.CreateResult result = orderService.createAndSubmitOrder(request, "cashier-4");

        assertThat(result.created()).isFalse();
        assertThat(result.order().status()).isEqualTo(OrderStatus.KITCHEN);
        verifyNoInteractions(productRepository, stockMovementRepository, kitchenOrderRepository);
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
    void dineInOrderLocksAndOccupiesTheSelectedTable() {
        RestaurantTable table = RestaurantTable.builder().id(44L).name("T44").status(TableStatus.AVAILABLE).build();
        Product product = Product.builder().id(4L).name("Breakfast plate").price(new BigDecimal("100.00")).active(true).build();
        when(tableRepository.findByIdForUpdate(44L)).thenReturn(Optional.of(table));
        when(productRepository.findById(4L)).thenReturn(Optional.of(product));
        when(modifierGroupRepository.findByProductId(4L)).thenReturn(List.of());
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.DINE_IN, "dine-in-table-order-1234",
                new RestaurantOrderRequest.TableReference(44L), null, null, null,
                List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        RestaurantOrderService.CreateResult result = orderService.createOrder(request, "cashier-4");

        assertThat(result.order().table().id()).isEqualTo(44L);
        assertThat(table.getStatus()).isEqualTo(TableStatus.OCCUPIED);
        assertThat(table.getOccupiedAt()).isNotNull();
        verify(tableRepository).findByIdForUpdate(44L);
        verify(tableRepository).save(table);
        verify(auditService).log("cashier-4", "TABLE_STATUS_CHANGED", "RestaurantTable", "44", "AVAILABLE", "OCCUPIED");
    }

    @Test
    void openDineInOrderCanTransferToAnotherAvailableTable() {
        RestaurantTable currentTable = RestaurantTable.builder().id(44L).name("T44").status(TableStatus.OCCUPIED).build();
        RestaurantTable nextTable = RestaurantTable.builder().id(45L).name("T45").status(TableStatus.AVAILABLE).build();
        Product product = Product.builder().id(4L).name("Breakfast plate").price(new BigDecimal("100.00")).active(true).build();
        RestaurantOrder order = RestaurantOrder.builder().id(25L).cashierId("cashier-4").orderType(OrderType.DINE_IN)
                .status(OrderStatus.OPEN).table(currentTable)
                .items(new java.util.ArrayList<>(List.of(OrderItem.builder().productId(4L).quantity(1).build()))).build();
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));
        when(tableRepository.findByIdForUpdate(45L)).thenReturn(Optional.of(nextTable));
        when(productRepository.findById(4L)).thenReturn(Optional.of(product));
        when(modifierGroupRepository.findByProductId(4L)).thenReturn(List.of());
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.DINE_IN, null,
                new RestaurantOrderRequest.TableReference(45L), null, null, null,
                List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        var transferred = orderService.updateOrder(25L, request, "cashier-4");

        assertThat(transferred.table().id()).isEqualTo(45L);
        assertThat(currentTable.getStatus()).isEqualTo(TableStatus.CLEANING);
        assertThat(nextTable.getStatus()).isEqualTo(TableStatus.OCCUPIED);
        verify(tableRepository).save(currentTable);
        verify(tableRepository).save(nextTable);
    }

    @Test
    void dineInOrderRejectsATableAlreadyTakenByAnotherOrder() {
        RestaurantTable table = RestaurantTable.builder().id(44L).name("T44").status(TableStatus.OCCUPIED).build();
        when(tableRepository.findByIdForUpdate(44L)).thenReturn(Optional.of(table));
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.DINE_IN, "dine-in-table-order-1234",
                new RestaurantOrderRequest.TableReference(44L), null, null, null,
                List.of(new RestaurantOrderItemRequest(4L, 1, null, List.of())));

        assertThatThrownBy(() -> orderService.createOrder(request, "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Selected table is no longer available");
        verify(tableRepository, never()).save(any());
        verifyNoInteractions(productRepository);
    }

    @Test
    void cancellingDineInOrderMovesItsTableAndKitchenTicketToTheirNextStates() {
        OrderItem item = OrderItem.builder().productId(4L).productName("Breakfast plate").quantity(1)
                .kitchenStatus(KitchenStatus.PREPARING).build();
        RestaurantTable table = RestaurantTable.builder().id(44L).name("T44").status(TableStatus.OCCUPIED)
                .occupiedAt(java.time.LocalDateTime.now()).build();
        RestaurantOrder order = RestaurantOrder.builder().id(25L).cashierId("cashier-4").status(OrderStatus.KITCHEN)
                .table(table).items(new java.util.ArrayList<>(List.of(item))).build();
        KitchenOrder ticket = KitchenOrder.builder().id(16L).order(order).status(KitchenStatus.PREPARING).build();
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));
        when(kitchenOrderRepository.findByOrder_Id(25L)).thenReturn(Optional.of(ticket));

        var cancelled = orderService.cancelOrder(25L, "cashier-4");

        assertThat(cancelled.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(table.getStatus()).isEqualTo(TableStatus.CLEANING);
        assertThat(table.getOccupiedAt()).isNull();
        assertThat(ticket.getStatus()).isEqualTo(KitchenStatus.CANCELLED);
        assertThat(item.getKitchenStatus()).isEqualTo(KitchenStatus.CANCELLED);
        verify(tableRepository).save(table);
        verify(auditService).log("cashier-4", "TABLE_STATUS_CHANGED", "RestaurantTable", "44", "OCCUPIED", "CLEANING");
        verify(auditService).log("cashier-4", "ORDER_CANCELLED", "RestaurantOrder", "25", "KITCHEN", "CANCELLED");
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

    @Test
    void cashierCannotSubmitAnotherCashiersOrder() {
        RestaurantOrder order = RestaurantOrder.builder().id(25L).cashierId("cashier-9")
                .status(OrderStatus.OPEN).items(new java.util.ArrayList<>(List.of(
                        OrderItem.builder().productId(4L).quantity(1).build()))).build();
        when(orderRepository.findByIdForUpdate(25L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.submitToKitchen(25L, "KITCHEN", "cashier-4"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Order not found");
        verifyNoInteractions(productRepository, stockMovementRepository, kitchenOrderRepository);
        verify(orderRepository, never()).save(any());
    }
}
