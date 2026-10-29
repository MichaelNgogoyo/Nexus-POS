package com.pos.service;

import com.pos.model.RestaurantTable;
import com.pos.model.OrderStatus;
import com.pos.model.TableStatus;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TableServiceTest {

    @Mock private RestaurantTableRepository tableRepository;
    @Mock private RestaurantOrderRepository orderRepository;
    @Mock private AuditService auditService;

    @Test
    void statusChangeIsPersistedAndAudited() {
        TableService service = new TableService(tableRepository, orderRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.CLEANING).build();
        when(tableRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(table));
        when(tableRepository.save(table)).thenReturn(table);

        RestaurantTable updated = service.updateStatus(7L, " available ", "manager-1");

        assertThat(updated.getStatus()).isEqualTo(TableStatus.AVAILABLE);
        assertThat(updated.getOccupiedAt()).isNull();
        verify(auditService).log("manager-1", "TABLE_STATUS_CHANGED", "RestaurantTable", "7", "CLEANING", "AVAILABLE");
    }

    @Test
    void invalidStatusIsRejectedWithoutChangingTable() {
        TableService service = new TableService(tableRepository, orderRepository, auditService);

        assertThatThrownBy(() -> service.updateStatus(7L, "BROKEN", "cashier-1"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Unknown table status");
        verifyNoInteractions(tableRepository, auditService);
    }

    @Test
    void releasingTableClearsItsOccupiedTimestamp() {
        TableService service = new TableService(tableRepository, orderRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.CLEANING)
                .occupiedAt(null).build();
        when(tableRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any(RestaurantTable.class))).thenAnswer(call -> call.getArgument(0));

        RestaurantTable updated = service.updateStatus(7L, "AVAILABLE", "manager-1");

        assertThat(updated.getStatus()).isEqualTo(TableStatus.AVAILABLE);
        assertThat(updated.getOccupiedAt()).isNull();
        verify(auditService).log("manager-1", "TABLE_STATUS_CHANGED", "RestaurantTable", "7", "CLEANING", "AVAILABLE");
    }

    @Test
    void occupiedTableCannotBeMarkedCleaningWhileUnsettledOrdersExist() {
        TableService service = new TableService(tableRepository, orderRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.OCCUPIED).build();
        when(tableRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(table));
        when(orderRepository.existsByTable_IdAndStatusIn(7L, List.of(OrderStatus.OPEN, OrderStatus.KITCHEN,
                OrderStatus.READY, OrderStatus.COMPLETED))).thenReturn(true);

        assertThatThrownBy(() -> service.updateStatus(7L, "CLEANING", "manager-1"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("unsettled order");
        verify(tableRepository, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void occupiedTableCannotBeMarkedAvailableDirectly() {
        TableService service = new TableService(tableRepository, orderRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.OCCUPIED).build();
        when(tableRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(table));

        assertThatThrownBy(() -> service.updateStatus(7L, "AVAILABLE", "manager-1"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Invalid table transition");
        verifyNoInteractions(orderRepository, auditService);
        verify(tableRepository, never()).save(any());
    }

    @Test
    void availableTableCannotBeManuallyMarkedOccupied() {
        TableService service = new TableService(tableRepository, orderRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.AVAILABLE).build();
        when(tableRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(table));

        assertThatThrownBy(() -> service.updateStatus(7L, "OCCUPIED", "manager-1"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("occupancy is created by starting a dine-in order");
        verifyNoInteractions(orderRepository, auditService);
        verify(tableRepository, never()).save(any());
    }
}
