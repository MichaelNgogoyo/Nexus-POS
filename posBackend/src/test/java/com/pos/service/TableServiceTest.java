package com.pos.service;

import com.pos.model.RestaurantTable;
import com.pos.model.TableStatus;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TableServiceTest {

    @Mock private RestaurantTableRepository tableRepository;
    @Mock private AuditService auditService;

    @Test
    void statusChangeIsPersistedAndAudited() {
        TableService service = new TableService(tableRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.AVAILABLE).build();
        when(tableRepository.findById(7L)).thenReturn(Optional.of(table));
        when(tableRepository.save(table)).thenReturn(table);

        RestaurantTable updated = service.updateStatus(7L, " occupied ", "cashier-1");

        assertThat(updated.getStatus()).isEqualTo(TableStatus.OCCUPIED);
        assertThat(updated.getOccupiedAt()).isNotNull();
        verify(auditService).log("cashier-1", "TABLE_STATUS_CHANGED", "RestaurantTable", "7", "AVAILABLE", "OCCUPIED");
    }

    @Test
    void invalidStatusIsRejectedWithoutChangingTable() {
        TableService service = new TableService(tableRepository, auditService);

        assertThatThrownBy(() -> service.updateStatus(7L, "BROKEN", "cashier-1"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Unknown table status");
        verifyNoInteractions(tableRepository, auditService);
    }

    @Test
    void releasingTableClearsItsOccupiedTimestamp() {
        TableService service = new TableService(tableRepository, auditService);
        RestaurantTable table = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.OCCUPIED)
                .occupiedAt(java.time.LocalDateTime.now()).build();
        when(tableRepository.findById(7L)).thenReturn(Optional.of(table));
        when(tableRepository.save(any(RestaurantTable.class))).thenAnswer(call -> call.getArgument(0));

        RestaurantTable updated = service.updateStatus(7L, "AVAILABLE", "manager-1");

        assertThat(updated.getStatus()).isEqualTo(TableStatus.AVAILABLE);
        assertThat(updated.getOccupiedAt()).isNull();
        verify(auditService).log("manager-1", "TABLE_STATUS_CHANGED", "RestaurantTable", "7", "OCCUPIED", "AVAILABLE");
    }
}
