package com.pos.service;

import com.pos.dto.OrderPaymentRequest;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.model.OrderStatus;
import com.pos.model.OrderType;
import com.pos.model.Product;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import com.pos.service.impl.SalesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@SpringBootTest(properties = {
        "spring.profiles.active=integration",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=http://127.0.0.1:8999/realms/pos",
        "KEYCLOAK_ISSUER_URI=http://127.0.0.1:8999/realms/pos",
        "KEYCLOAK_CLIENT_ID=pos-client",
        "KEYCLOAK_CLIENT_SECRET=integration-test-only",
        "KEYCLOAK_REDIRECT_URI=http://127.0.0.1:5173/*",
        "MINIO_ENDPOINT=http://127.0.0.1:9000",
        "MINIO_ACCESS_KEY=integration-test-only",
        "MINIO_SECRET_KEY=integration-test-only",
        "MINIO_BUCKET=integration-test-only",
        "pos.tax-rate=10",
        "pos.service-charge-rate=5"
})
class OrderPaymentPostgresIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @MockitoBean
    JwtDecoder jwtDecoder;

    @Autowired
    RestaurantOrderService orderService;

    @Autowired
    SalesService salesService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    RestaurantOrderRepository orderRepository;

    @Autowired
    SalesRepository salesRepository;

    @Autowired
    KitchenOrderRepository kitchenOrderRepository;

    @Autowired
    StockMovementRepository stockMovementRepository;

    @Test
    void submitsUnpaidOrderConsumesStockThenSettlesCashExactlyOnce() throws Exception {
        Product product = productRepository.saveAndFlush(Product.builder()
                .name("Integration breakfast")
                .price(new BigDecimal("100.00"))
                .active(true)
                .quantity(8)
                .build());
        RestaurantOrderRequest orderRequest = new RestaurantOrderRequest(
                OrderType.TAKEAWAY,
                "integration-order-key-0001",
                null,
                null,
                "Test guest",
                "Kitchen note",
                List.of(new RestaurantOrderItemRequest(product.getId(), 2, "No onions", List.of())));

        RestaurantOrderService.CreateResult created = orderService.createAndSubmitOrder(orderRequest, "integration-cashier");

        assertThat(created.created()).isTrue();
        assertThat(created.order().status()).isEqualTo(OrderStatus.KITCHEN);
        assertThat(created.order().total()).isEqualByComparingTo("230.00");
        assertThat(productRepository.findById(product.getId()).orElseThrow().getQuantity()).isEqualTo(6);
        assertThat(kitchenOrderRepository.findByOrder_Id(created.order().id())).isPresent();
        assertThat(stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId()))
                .singleElement().satisfies(movement -> {
                    assertThat(movement.getDelta()).isEqualTo(-2);
                    assertThat(movement.getBalanceAfter()).isEqualTo(6);
                });

        OrderPaymentRequest paymentRequest = new OrderPaymentRequest(
                new BigDecimal("250.00"), "integration-payment-key-0001");
        List<Future<com.pos.model.Sales>> attempts = settleConcurrently(created.order().id(), paymentRequest);
        var sale = attempts.get(0).get(10, TimeUnit.SECONDS);
        var concurrentReplay = attempts.get(1).get(10, TimeUnit.SECONDS);

        assertThat(sale.getId()).isNotNull();
        assertThat(concurrentReplay.getId()).isEqualTo(sale.getId());
        assertThat(sale.getRestaurantOrderId()).isEqualTo(created.order().id());
        assertThat(sale.getTotalAmount()).isEqualByComparingTo("230.00");
        assertThat(sale.getChangeGiven()).isEqualByComparingTo("20.00");
        assertThat(sale.getSaleItems()).hasSize(1);
        assertThat(orderRepository.findById(created.order().id()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PAID);

        var replay = salesService.settleOrderCash(created.order().id(), paymentRequest, "integration-cashier");
        assertThat(replay.getId()).isEqualTo(sale.getId());
        assertThat(salesRepository.count()).isEqualTo(1);
        assertThat(productRepository.findById(product.getId()).orElseThrow().getQuantity()).isEqualTo(6);
        assertThat(stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId())).hasSize(1);
        assertThat(orderRepository.findById(created.order().id()).orElseThrow().getSaleId()).isEqualTo(sale.getId());

        assertThatThrownBy(() -> salesService.settleOrderCash(created.order().id(),
                new OrderPaymentRequest(new BigDecimal("250.00"), "different-payment-key-0001"), "integration-cashier"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("already been recorded");
    }

    private List<Future<com.pos.model.Sales>> settleConcurrently(Long orderId, OrderPaymentRequest request) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<com.pos.model.Sales> first = pool.submit(() -> {
                ready.countDown();
                start.await();
                return salesService.settleOrderCash(orderId, request, "integration-cashier");
            });
            Future<com.pos.model.Sales> second = pool.submit(() -> {
                ready.countDown();
                start.await();
                return salesService.settleOrderCash(orderId, request, "integration-cashier");
            });
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(first, second);
        } finally {
            if (start.getCount() > 0) start.countDown();
            pool.shutdown();
        }
    }
}
