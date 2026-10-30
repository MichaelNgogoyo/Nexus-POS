package com.pos.controller;

import com.pos.config.auth.SecurityConfig;
import com.pos.model.RestaurantTable;
import com.pos.model.TableStatus;
import com.pos.repository.RestaurantTableRepository;
import com.pos.repository.SupplierRepository;
import com.pos.service.TableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = OperationalMutationAuthorizationTest.TestSecurityConfiguration.class)
@TestPropertySource(properties = "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8999/realms/pos")
class OperationalMutationAuthorizationTest {

    @Autowired
    private WebApplicationContext applicationContext;

    private MockMvc mockMvc;

    @MockitoBean
    private RestaurantTableRepository tableRepository;

    @MockitoBean
    private TableService tableService;

    @MockitoBean
    private SupplierRepository supplierRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    void cashierCannotManuallySetTableOccupancy() throws Exception {
        mockMvc.perform(put("/api/tables/7/status")
                        .with(user("cashier").roles("CASHIER"))
                        .contentType("application/json")
                        .content("{\"status\":\"OCCUPIED\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(tableService);
    }

    @Test
    void stockClerkCannotDeleteSupplier() throws Exception {
        mockMvc.perform(delete("/api/suppliers/9").with(user("stock").roles("STOCK_CLERK")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(supplierRepository);
    }

    @Test
    void genericTableUpdateCannotOverwriteOccupancyEvenForManager() throws Exception {
        RestaurantTable existing = RestaurantTable.builder().id(7L).name("T7").status(TableStatus.AVAILABLE).build();
        when(tableRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(tableRepository.save(any(RestaurantTable.class))).thenAnswer(call -> call.getArgument(0));

        mockMvc.perform(put("/api/tables/7")
                        .with(user("manager").roles("MANAGER"))
                        .contentType("application/json")
                        .content("{\"name\":\"T7 updated\",\"floor\":\"Ground\",\"capacity\":4,\"status\":\"OCCUPIED\",\"occupiedAt\":\"2026-10-29T10:00:00\"}"))
                .andExpect(status().isOk());

        verify(tableRepository).save(org.mockito.ArgumentMatchers.argThat(table ->
                table.getStatus() == TableStatus.AVAILABLE && table.getOccupiedAt() == null));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({SecurityConfig.class, TableController.class, SupplierController.class})
    static class TestSecurityConfiguration {
    }
}
