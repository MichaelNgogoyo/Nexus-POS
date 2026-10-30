package com.pos.controller;

import com.pos.dto.RestaurantOrderRequest;
import com.pos.model.OrderType;
import com.pos.service.RestaurantOrderService;
import com.pos.service.impl.SalesService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrderControllerIdentityTest {

    @Test
    void cashierOrderIdentityUsesKeycloakSubjectAndKeepsUsernameAliasForExistingOrders() {
        RestaurantOrderService orders = mock(RestaurantOrderService.class);
        SalesService sales = mock(SalesService.class);
        OrderController controller = new OrderController(orders, sales);
        RestaurantOrderRequest request = new RestaurantOrderRequest(OrderType.TAKEAWAY,
                "identity-order-request-123", null, null, null, null, List.of());
        when(orders.createOrder(any(), any(), any()))
                .thenReturn(new RestaurantOrderService.CreateResult(null, true));

        controller.createOrder(request, authentication());

        verify(orders).createOrder(eq(request), eq("kc-subject-123"),
                argThat(identities -> identities.equals(Set.of("cashier.michael", "kc-subject-123"))));
    }

    @Test
    void cashierPaymentUsesTheSameSubjectAsShiftsAndIncludesUsernameForLegacyOrderOwnership() {
        RestaurantOrderService orders = mock(RestaurantOrderService.class);
        SalesService sales = mock(SalesService.class);
        OrderController controller = new OrderController(orders, sales);
        var request = new com.pos.dto.OrderPaymentRequest(new java.math.BigDecimal("20.00"),
                "identity-payment-request-123");

        controller.recordCashPayment(4L, request, authentication());

        verify(sales).settleOrderCash(eq(4L), eq(request), eq("kc-subject-123"),
                argThat(identities -> identities.equals(Set.of("cashier.michael", "kc-subject-123"))), eq(false));
    }

    private JwtAuthenticationToken authentication() {
        Jwt token = Jwt.withTokenValue("unit-test-token")
                .header("alg", "none")
                .subject("kc-subject-123")
                .claim("preferred_username", "cashier.michael")
                .build();
        return new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_CASHIER")), "cashier.michael");
    }
}
