package com.pos.service.impl;

import com.pos.dto.CashMovementRequest;
import com.pos.model.CashMovement;
import com.pos.model.CashMovementType;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.repository.CashMovementRepository;
import com.pos.repository.ShiftRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CashMovementServiceTest {

    private final CashMovementRepository movementRepository = mock(CashMovementRepository.class);
    private final ShiftRepository shiftRepository = mock(ShiftRepository.class);
    private final AuditService auditService = mock(AuditService.class);
    private final CashMovementService service = new CashMovementService(movementRepository, shiftRepository, auditService);

    @Test
    void expectedMovementAddsCashInAndSubtractsCashOutAndRefunds() {
        when(movementRepository.sumAmount(7L, CashMovementType.CASH_IN)).thenReturn(new BigDecimal("80.00"));
        when(movementRepository.sumAmount(7L, CashMovementType.CASH_OUT)).thenReturn(new BigDecimal("20.00"));
        when(movementRepository.sumAmount(7L, CashMovementType.CASH_REFUND)).thenReturn(new BigDecimal("15.00"));

        assertThat(service.netMovementForShift(7L)).isEqualByComparingTo("45.00");
    }

    @Test
    void repeatedIdenticalCashMovementIsReturnedWithoutCreatingAnotherRow() {
        Shift shift = Shift.builder().id(7L).status(ShiftStatus.OPEN).build();
        CashMovement prior = CashMovement.builder().id(10L).shiftId(7L).type(CashMovementType.CASH_IN)
                .amount(new BigDecimal("20.00")).reason("Change float").createdBy("manager")
                .idempotencyKey("movement-123456").build();
        when(shiftRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(shift));
        when(movementRepository.findByIdempotencyKey("movement-123456")).thenReturn(Optional.of(prior));

        var result = service.recordShiftMovement(7L,
                new CashMovementRequest(CashMovementType.CASH_IN, new BigDecimal("20.00"), "Change float", "movement-123456"),
                "manager");

        assertThat(result.id()).isEqualTo(10L);
        verify(movementRepository, never()).save(any());
    }

    @Test
    void refusesCashMovementAgainstClosedShift() {
        Shift shift = Shift.builder().id(7L).status(ShiftStatus.CLOSED).build();
        when(shiftRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(shift));

        assertThatThrownBy(() -> service.recordShiftMovement(7L,
                new CashMovementRequest(CashMovementType.CASH_OUT, new BigDecimal("20.00"), "Petty cash", "movement-123456"),
                "manager"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("require an open shift");
        verifyNoInteractions(movementRepository);
    }

    @Test
    void cashPaymentsRequireAnOpenRegisterShift() {
        when(shiftRepository.findByCashierIdAndStatusForUpdate("cashier", ShiftStatus.OPEN))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.lockOpenShiftForCashier("cashier"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Open a register shift");
    }
}
