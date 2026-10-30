package com.pos.controller;

import com.pos.model.Sales;
import com.pos.service.impl.SalesService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SalesControllerReceiptAccessTest {
    private final SalesService salesService = mock(SalesService.class);
    private final SalesController controller = new SalesController(salesService);

    @Test
    void cashierCanReadTheirOwnReceipt() {
        when(salesService.viewSale(4L)).thenReturn(Sales.builder().id(4L).cashierId("cashier-1").totalAmount(new BigDecimal("12.00")).build());

        var response = controller.getSaleReceipt(4L, cashier("cashier-1"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Receipt #:   4");
    }

    @Test
    void cashierCannotReadAnotherCashiersReceipt() {
        when(salesService.viewSale(4L)).thenReturn(Sales.builder().id(4L).cashierId("cashier-2").build());

        assertThatThrownBy(() -> controller.getSaleReceipt(4L, cashier("cashier-1")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cashiers may only access their own receipts");
    }

    @Test
    void managerCanReadAnotherCashiersReceipt() {
        when(salesService.viewSale(4L)).thenReturn(Sales.builder().id(4L).cashierId("cashier-2").build());
        var manager = new UsernamePasswordAuthenticationToken("manager-1", "", List.of(new SimpleGrantedAuthority("ROLE_MANAGER")));

        assertThat(controller.getSaleReceipt(4L, manager).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private UsernamePasswordAuthenticationToken cashier(String subject) {
        return new UsernamePasswordAuthenticationToken(subject, "", List.of(new SimpleGrantedAuthority("ROLE_CASHIER")));
    }
}
