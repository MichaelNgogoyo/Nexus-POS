package com.pos.controller;

import com.pos.dto.ShiftCloseRequest;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.repository.SalesRepository;
import com.pos.repository.ShiftRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ShiftControllerReconciliationTest {
    private final ShiftRepository shiftRepository = mock(ShiftRepository.class);
    private final AuditService auditService = mock(AuditService.class);
    private final SalesRepository salesRepository = mock(SalesRepository.class);
    private final ShiftController controller = new ShiftController(shiftRepository, auditService, salesRepository);

    @Test
    void closingShiftCalculatesExpectedCashAndVarianceFromServerSales() {
        Shift shift = Shift.builder().id(11L).cashierId("cashier-1").status(ShiftStatus.OPEN)
                .openingBalance(new BigDecimal("100.00")).openedAt(LocalDateTime.now().minusHours(4)).build();
        when(shiftRepository.findById(11L)).thenReturn(Optional.of(shift));
        when(salesRepository.sumCashSalesSince(eq("cashier-1"), any())).thenReturn(55.25);
        when(shiftRepository.save(any(Shift.class))).thenAnswer(call -> call.getArgument(0));
        ShiftCloseRequest request = new ShiftCloseRequest();
        request.setClosingBalance(new BigDecimal("150.00"));
        var cashier = new UsernamePasswordAuthenticationToken("cashier-1", "", List.of());

        Shift closed = controller.closeShift(11L, request, cashier).getBody();

        assertThat(closed).isNotNull();
        assertThat(closed.getExpectedBalance()).isEqualByComparingTo("155.25");
        assertThat(closed.getVariance()).isEqualByComparingTo("-5.25");
        assertThat(closed.getStatus()).isEqualTo(ShiftStatus.CLOSED);
        verify(auditService).log("cashier-1", "SHIFT_CLOSED", "Shift", "11", "OPEN", "CLOSED; expected=155.25; variance=-5.25");
    }
}
