package com.pos.controller;

import com.pos.model.Product;
import com.pos.config.auth.SecurityConfig;
import com.pos.handler.GlobalExceptionHandler;
import com.pos.service.impl.ProductService;
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

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = ProductControllerAuthorizationTest.TestSecurityConfiguration.class)
@TestPropertySource(properties = "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8999/realms/pos")
class ProductControllerAuthorizationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void cashierCannotReadLowStockAlerts() throws Exception {
        mockMvc.perform(get("/api/product/low-stock").with(user("cashier").roles("CASHIER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(productService);
    }

    @Test
    void stockClerkCanReadLowStockAlerts() throws Exception {
        when(productService.getLowStockProducts()).thenReturn(List.of(Product.builder().id(9L).name("Milk").build()));

        mockMvc.perform(get("/api/product/low-stock").with(user("stock").roles("STOCK_CLERK")))
                .andExpect(status().isOk());

        verify(productService).getLowStockProducts();
    }

    @Test
    void cashierCannotReadStockMovementHistory() throws Exception {
        mockMvc.perform(get("/api/product/9/stock-movements").with(user("cashier").roles("CASHIER")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(productService);
    }

    @Test
    void stockClerkCanReadStockMovementHistory() throws Exception {
        when(productService.getStockMovements(9L)).thenReturn(List.of());

        mockMvc.perform(get("/api/product/9/stock-movements").with(user("stock").roles("STOCK_CLERK")))
                .andExpect(status().isOk());

        verify(productService).getStockMovements(9L);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfig.class, GlobalExceptionHandler.class, ProductController.class})
    static class TestSecurityConfiguration {
    }
}
