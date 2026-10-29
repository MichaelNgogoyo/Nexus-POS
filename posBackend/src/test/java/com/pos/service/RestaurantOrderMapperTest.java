package com.pos.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pos.model.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RestaurantOrderMapperTest {

    private final RestaurantOrderMapper mapper = new RestaurantOrderMapper();

    @Test
    void responseDtoKeepsCashierOrderFieldsWithoutExposingJpaEntity() throws Exception {
        Modifier modifier = Modifier.builder().id(7L).name("Extra cheese").additionalPrice(new BigDecimal("1.50")).available(true).build();
        OrderItem item = OrderItem.builder().id(8L).productId(4L).productName("Toast")
                .unitPrice(new BigDecimal("5.00")).quantity(2).lineTotal(new BigDecimal("10.00"))
                .modifiers(List.of(modifier)).kitchenStatus(KitchenStatus.PENDING).build();
        RestaurantOrder order = RestaurantOrder.builder().id(12L).orderNumber("ORD-12").orderType(OrderType.DINE_IN)
                .status(OrderStatus.OPEN).table(RestaurantTable.builder().id(3L).name("T3").capacity(4).status(TableStatus.OCCUPIED).build())
                .items(List.of(item)).subtotal(new BigDecimal("10.00")).taxAmount(new BigDecimal("1.60"))
                .serviceChargeAmount(new BigDecimal("0.00")).discountAmount(BigDecimal.ZERO).total(new BigDecimal("11.60")).build();

        var response = mapper.toResponse(order);
        String json = new ObjectMapper().writeValueAsString(response);

        assertThat(response.id()).isEqualTo(12L);
        assertThat(response.table().name()).isEqualTo("T3");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).modifiers().get(0).additionalPrice()).isEqualByComparingTo("1.50");
        assertThat(json).contains("\"orderNumber\":\"ORD-12\"", "\"productName\":\"Toast\"", "\"total\":11.60");
        assertThat(json).doesNotContain("hibernateLazyInitializer", "handler");
    }
}
