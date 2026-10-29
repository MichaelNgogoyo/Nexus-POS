package com.pos.controller;

import com.pos.dto.KitchenStatusRequest;
import com.pos.dto.KitchenTicketResponse;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.model.OrderStatus;
import com.pos.model.OrderItem;
import com.pos.model.Modifier;
import com.pos.model.RestaurantOrder;
import com.pos.model.RestaurantTable;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Arrays;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KitchenControllerWorkflowTest {
    private final KitchenOrderRepository kitchenRepository = mock(KitchenOrderRepository.class);
    private final RestaurantOrderRepository orderRepository = mock(RestaurantOrderRepository.class);
    private final AuditService auditService = mock(AuditService.class);
    private final KitchenController controller = new KitchenController(kitchenRepository, orderRepository, auditService);

    @Test
    void defaultKitchenQueueOmitsServedAndCancelledHistory() {
        KitchenOrder pending = KitchenOrder.builder().id(1L).status(KitchenStatus.PENDING).build();
        when(kitchenRepository.findByStatusIn(List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING, KitchenStatus.READY)))
                .thenReturn(List.of(pending));

        assertThat(controller.getAllKitchenOrders(null, false)).extracting(KitchenTicketResponse::status)
                .containsExactly(KitchenStatus.PENDING);

        verify(kitchenRepository).findByStatusIn(List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING, KitchenStatus.READY));
        verify(kitchenRepository, never()).findByStatusNot(any());
    }

    @Test
    void kitchenHistoryIncludesServedAndCancelledTicketsOnRequest() {
        when(kitchenRepository.findByStatusIn(Arrays.asList(KitchenStatus.PENDING, KitchenStatus.PREPARING,
                KitchenStatus.READY, KitchenStatus.SERVED, KitchenStatus.CANCELLED))).thenReturn(List.of());

        assertThat(controller.getAllKitchenOrders(null, true)).isEmpty();

        verify(kitchenRepository).findByStatusIn(Arrays.asList(KitchenStatus.PENDING, KitchenStatus.PREPARING,
                KitchenStatus.READY, KitchenStatus.SERVED, KitchenStatus.CANCELLED));
    }

    @Test
    void kitchenTicketProjectionContainsPreparationDataButNoCustomerOrMoneyFields() {
        Modifier modifier = Modifier.builder().name("No onion").additionalPrice(new BigDecimal("20.00")).build();
        OrderItem item = OrderItem.builder().id(9L).productName("Soup").quantity(2).notes("No salt")
                .modifiers(List.of(modifier)).kitchenStatus(KitchenStatus.PENDING).unitPrice(new BigDecimal("50.00")).build();
        RestaurantOrder order = RestaurantOrder.builder().id(8L).orderNumber("ORD-8").customerName("Guest Name")
                .total(new BigDecimal("120.00")).orderType(com.pos.model.OrderType.DINE_IN)
                .table(RestaurantTable.builder().id(4L).name("T4").build()).items(List.of(item)).build();
        KitchenOrder ticket = KitchenOrder.builder().id(5L).order(order).status(KitchenStatus.PENDING).notes("Rush").build();
        when(kitchenRepository.findByStatusIn(List.of(KitchenStatus.PENDING, KitchenStatus.PREPARING, KitchenStatus.READY)))
                .thenReturn(List.of(ticket));

        KitchenTicketResponse response = controller.getAllKitchenOrders(null, false).get(0);

        assertThat(response.notes()).isEqualTo("Rush");
        assertThat(response.order().orderNumber()).isEqualTo("ORD-8");
        assertThat(response.order().table().name()).isEqualTo("T4");
        assertThat(response.order().items().get(0).productName()).isEqualTo("Soup");
        assertThat(response.order().items().get(0).modifiers()).extracting(KitchenTicketResponse.ModifierSummary::name)
                .containsExactly("No onion");
        assertThat(Arrays.stream(KitchenTicketResponse.class.getRecordComponents()).map(component -> component.getName()))
                .doesNotContain("customerName", "cashierId", "total", "subtotal");
        assertThat(Arrays.stream(KitchenTicketResponse.OrderSummary.class.getRecordComponents()).map(component -> component.getName()))
                .doesNotContain("customerName", "total", "subtotal");
    }

    @Test
    void kitchenReadyTransitionUpdatesTheLinkedRestaurantOrder() {
        OrderItem item = OrderItem.builder().productName("Soup").kitchenStatus(KitchenStatus.PREPARING).build();
        RestaurantOrder order = RestaurantOrder.builder().id(8L).status(OrderStatus.KITCHEN).items(new java.util.ArrayList<>(List.of(item))).build();
        KitchenOrder ticket = KitchenOrder.builder().id(5L).order(order).status(KitchenStatus.PREPARING).build();
        when(kitchenRepository.findById(5L)).thenReturn(Optional.of(ticket));
        when(orderRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(order));
        when(kitchenRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(ticket));
        when(kitchenRepository.save(any(KitchenOrder.class))).thenAnswer(call -> call.getArgument(0));
        when(orderRepository.save(any(RestaurantOrder.class))).thenAnswer(call -> call.getArgument(0));
        KitchenStatusRequest request = new KitchenStatusRequest();
        request.setStatus("READY");

        var response = controller.updateStatus(5L, request,
                new UsernamePasswordAuthenticationToken("kitchen-1", "", List.of()));

        assertThat(response.getBody().status()).isEqualTo(KitchenStatus.READY);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(item.getKitchenStatus()).isEqualTo(KitchenStatus.READY);
        assertThat(response.getBody().completedAt()).isNotNull();
        verify(orderRepository).save(order);
        verify(orderRepository).findByIdForUpdate(8L);
        verify(kitchenRepository).findByIdForUpdate(5L);
        verify(auditService).log("kitchen-1", "KITCHEN_STATUS_CHANGED", "KitchenOrder", "5", "PREPARING", "READY");
    }

    @Test
    void servingAnAlreadyPaidOrderDoesNotOverwriteItsPaymentState() {
        RestaurantOrder order = RestaurantOrder.builder().id(8L).saleId(31L).status(OrderStatus.PAID)
                .items(new java.util.ArrayList<>()).build();
        KitchenOrder ticket = KitchenOrder.builder().id(5L).order(order).status(KitchenStatus.READY).build();
        when(kitchenRepository.findById(5L)).thenReturn(Optional.of(ticket));
        when(orderRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(order));
        when(kitchenRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(ticket));
        when(kitchenRepository.save(any(KitchenOrder.class))).thenAnswer(call -> call.getArgument(0));
        when(orderRepository.save(any(RestaurantOrder.class))).thenAnswer(call -> call.getArgument(0));
        KitchenStatusRequest request = new KitchenStatusRequest();
        request.setStatus("SERVED");

        controller.updateStatus(5L, request, new UsernamePasswordAuthenticationToken("kitchen-1", "", List.of()));

        assertThat(ticket.getStatus()).isEqualTo(KitchenStatus.SERVED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    void kitchenCannotSkipTicketStages() {
        KitchenOrder ticket = KitchenOrder.builder().id(5L).status(KitchenStatus.PENDING).build();
        when(kitchenRepository.findById(5L)).thenReturn(Optional.of(ticket));
        when(kitchenRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(ticket));
        KitchenStatusRequest request = new KitchenStatusRequest();
        request.setStatus("SERVED");

        assertThatThrownBy(() -> controller.updateStatus(5L, request,
                new UsernamePasswordAuthenticationToken("kitchen-1", "", List.of())))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid kitchen ticket status transition");
        verify(kitchenRepository, never()).save(any());
        verifyNoInteractions(orderRepository, auditService);
    }
}
