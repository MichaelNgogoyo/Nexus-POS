package com.pos.controller;

import com.pos.config.auth.SecurityConfig;
import com.pos.dto.PurchaseOrderResponse;
import com.pos.model.PurchaseOrderStatus;
import com.pos.service.PurchaseOrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.http.MediaType.APPLICATION_JSON;

@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = PurchaseOrderControllerAuthorizationTest.TestSecurityConfiguration.class)
@TestPropertySource(properties = "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8999/realms/pos")
class PurchaseOrderControllerAuthorizationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    private MockMvc mockMvc;

    @MockitoBean
    private PurchaseOrderService purchaseOrderService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void cashierCannotReadPurchaseOrders() throws Exception {
        mockMvc.perform(get("/api/purchase-orders").with(user("cashier").roles("CASHIER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(purchaseOrderService);
    }

    @Test
    void stockClerkCanReceivePurchaseOrder() throws Exception {
        when(purchaseOrderService.receive(7L, "stock-clerk")).thenReturn(response(PurchaseOrderStatus.RECEIVED));

        mockMvc.perform(put("/api/purchase-orders/7/receive").with(user("stock-clerk").roles("STOCK_CLERK")))
                .andExpect(status().isOk());

        verify(purchaseOrderService).receive(7L, "stock-clerk");
    }

    @Test
    void stockClerkCannotCreatePurchaseOrder() throws Exception {
        mockMvc.perform(post("/api/purchase-orders").with(user("stock-clerk").roles("STOCK_CLERK"))
                        .contentType(APPLICATION_JSON)
                        .content("{\"items\":[{\"productId\":7,\"orderedQuantity\":2,\"unitCost\":1.25}] }"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(purchaseOrderService);
    }

    @Test
    void procurementOfficerCanCreatePurchaseOrder() throws Exception {
        when(purchaseOrderService.create(any(), eq("procurement"))).thenReturn(response(PurchaseOrderStatus.DRAFT));

        mockMvc.perform(post("/api/purchase-orders").with(user("procurement").roles("PROCUREMENT_OFFICER"))
                        .contentType(APPLICATION_JSON)
                        .content("{\"notes\":\"restock\",\"items\":[{\"productId\":7,\"orderedQuantity\":2,\"unitCost\":1.25}]}"))
                .andExpect(status().isCreated());

        verify(purchaseOrderService).create(any(), eq("procurement"));
    }

    private PurchaseOrderResponse response(PurchaseOrderStatus status) {
        return new PurchaseOrderResponse(7L, "PO-0007", null, null, status, List.of(),
                new BigDecimal("0.00"), null, "test", null, null);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfig.class, PurchaseOrderController.class})
    static class TestSecurityConfiguration {
    }
}
