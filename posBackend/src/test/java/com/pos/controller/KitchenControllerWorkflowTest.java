package com.pos.controller;

import com.pos.dto.KitchenStatusRequest;
import com.pos.model.KitchenOrder;
import com.pos.model.KitchenStatus;
import com.pos.model.OrderStatus;
import com.pos.model.OrderItem;
import com.pos.model.RestaurantOrder;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

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
    void kitchenReadyTransitionUpdatesTheLinkedRestaurantOrder() {
        OrderItem item = OrderItem.builder().productName("Soup").kitchenStatus(KitchenStatus.PREPARING).build();
        RestaurantOrder order = RestaurantOrder.builder().id(8L).status(OrderStatus.KITCHEN).items(new java.util.ArrayList<>(List.of(item))).build();
        KitchenOrder ticket = KitchenOrder.builder().id(5L).order(order).status(KitchenStatus.PREPARING).build();
        when(kitchenRepository.findById(5L)).thenReturn(Optional.of(ticket));
        when(kitchenRepository.save(any(KitchenOrder.class))).thenAnswer(call -> call.getArgument(0));
        when(orderRepository.save(any(RestaurantOrder.class))).thenAnswer(call -> call.getArgument(0));
        KitchenStatusRequest request = new KitchenStatusRequest();
        request.setStatus("READY");

        var response = controller.updateStatus(5L, request,
                new UsernamePasswordAuthenticationToken("kitchen-1", "", List.of()));

        assertThat(response.getBody().getStatus()).isEqualTo(KitchenStatus.READY);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);
        assertThat(item.getKitchenStatus()).isEqualTo(KitchenStatus.READY);
        assertThat(response.getBody().getCompletedAt()).isNotNull();
        verify(orderRepository).save(order);
        verify(auditService).log("kitchen-1", "KITCHEN_STATUS_CHANGED", "KitchenOrder", "5", "PREPARING", "READY");
    }

    @Test
    void kitchenCannotSkipTicketStages() {
        KitchenOrder ticket = KitchenOrder.builder().id(5L).status(KitchenStatus.PENDING).build();
        when(kitchenRepository.findById(5L)).thenReturn(Optional.of(ticket));
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
