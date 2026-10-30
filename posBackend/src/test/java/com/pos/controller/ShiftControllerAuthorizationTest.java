package com.pos.controller;

import com.pos.config.auth.SecurityConfig;
import com.pos.dto.CashMovementRequest;
import com.pos.dto.CashMovementResponse;
import com.pos.handler.GlobalExceptionHandler;
import com.pos.model.CashMovementType;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.repository.SalesRepository;
import com.pos.repository.ShiftRepository;
import com.pos.service.impl.AuditService;
import com.pos.service.impl.CashMovementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = ShiftControllerAuthorizationTest.TestSecurityConfiguration.class)
@TestPropertySource(properties = "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8999/realms/pos")
class ShiftControllerAuthorizationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    private MockMvc mockMvc;

    @MockitoBean private ShiftRepository shiftRepository;
    @MockitoBean private AuditService auditService;
    @MockitoBean private SalesRepository salesRepository;
    @MockitoBean private CashMovementService cashMovementService;
    @MockitoBean private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void cashierCannotRecordCashAdjustments() throws Exception {
        mockMvc.perform(post("/api/shifts/11/movements")
                        .with(user("cashier").roles("CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"CASH_OUT","amount":10.00,"reason":"Petty cash","idempotencyKey":"movement-123456"}
                                """))
                .andExpect(status().isForbidden());

        verifyNoInteractions(cashMovementService);
    }

    @Test
    void managerCanRecordCashAdjustments() throws Exception {
        when(cashMovementService.recordShiftMovement(eq(11L), any(CashMovementRequest.class), eq("manager")))
                .thenReturn(new CashMovementResponse(5L, 11L, CashMovementType.CASH_OUT,
                        new BigDecimal("10.00"), "Petty cash", null, "manager", null));

        mockMvc.perform(post("/api/shifts/11/movements")
                        .with(user("manager").roles("MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"CASH_OUT","amount":10.00,"reason":"Petty cash","idempotencyKey":"movement-123456"}
                                """))
                .andExpect(status().isCreated());

        verify(cashMovementService).recordShiftMovement(eq(11L), any(CashMovementRequest.class), eq("manager"));
    }

    @Test
    void cashierCanOnlyReadTheirOwnShiftMovements() throws Exception {
        when(cashMovementService.listForShift(11L, "cashier", false)).thenReturn(List.of());

        mockMvc.perform(get("/api/shifts/11/movements").with(user("cashier").roles("CASHIER")))
                .andExpect(status().isOk());

        verify(cashMovementService).listForShift(11L, "cashier", false);
    }

    @Test
    void concurrentShiftOpenReturnsConflictWhenUniqueConstraintWinsRace() throws Exception {
        when(shiftRepository.findByCashierIdAndStatus("cashier", ShiftStatus.OPEN))
                .thenReturn(Optional.empty(), Optional.of(Shift.builder().id(12L).status(ShiftStatus.OPEN).build()));
        doThrow(new DataIntegrityViolationException("open shift unique constraint"))
                .when(shiftRepository).saveAndFlush(any(Shift.class));

        mockMvc.perform(post("/api/shifts/open")
                        .with(user("cashier").roles("CASHIER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashierId":"cashier","cashierName":"Cashier","openingBalance":100.00}
                                """))
                .andExpect(status().isConflict());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfig.class, GlobalExceptionHandler.class, ShiftController.class})
    static class TestSecurityConfiguration {
    }
}
