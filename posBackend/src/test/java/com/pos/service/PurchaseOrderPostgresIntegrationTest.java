package com.pos.service;

import com.pos.dto.PurchaseOrderCreateRequest;
import com.pos.dto.PurchaseOrderLineRequest;
import com.pos.model.Product;
import com.pos.model.PurchaseOrderStatus;
import com.pos.repository.ProductRepository;
import com.pos.repository.StockMovementRepository;
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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

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
        "MINIO_BUCKET=integration-test-only"
})
class PurchaseOrderPostgresIntegrationTest {

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
    PurchaseOrderService purchaseOrderService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    StockMovementRepository stockMovementRepository;

    @Test
    void concurrentReceiptAddsStockAndLedgerEntryExactlyOnce() throws Exception {
        Product product = productRepository.saveAndFlush(Product.builder()
                .name("Integration purchase product")
                .price(new BigDecimal("12.00"))
                .active(true)
                .quantity(8)
                .build());

        var created = purchaseOrderService.create(new PurchaseOrderCreateRequest(null, "integration receipt", List.of(
                new PurchaseOrderLineRequest(product.getId(), 5, new BigDecimal("2.50")))), "integration-manager");
        var sent = purchaseOrderService.updateStatus(created.id(), PurchaseOrderStatus.SENT, "integration-manager");
        assertThat(sent.status()).isEqualTo(PurchaseOrderStatus.SENT);
        assertThat(sent.totalAmount()).isEqualByComparingTo("12.50");

        List<Future<?>> attempts = receiveConcurrently(created.id());
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        for (Future<?> attempt : attempts) {
            try {
                PurchaseOrderStatus status = ((com.pos.dto.PurchaseOrderResponse) attempt.get(10, TimeUnit.SECONDS)).status();
                if (status == PurchaseOrderStatus.RECEIVED) successes.incrementAndGet();
            } catch (ExecutionException exception) {
                if (exception.getCause() instanceof org.springframework.web.server.ResponseStatusException response
                        && response.getStatusCode().value() == 409) {
                    conflicts.incrementAndGet();
                } else {
                    throw exception;
                }
            }
        }

        assertThat(successes.get()).isEqualTo(1);
        assertThat(conflicts.get()).isEqualTo(1);
        assertThat(productRepository.findById(product.getId()).orElseThrow().getQuantity()).isEqualTo(13);
        assertThat(stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId()))
                .singleElement().satisfies(movement -> {
                    assertThat(movement.getDelta()).isEqualTo(5);
                    assertThat(movement.getBalanceAfter()).isEqualTo(13);
                    assertThat(movement.getReason()).contains(created.orderNumber());
                });
        assertThat(purchaseOrderService.getById(created.id()).orElseThrow().status()).isEqualTo(PurchaseOrderStatus.RECEIVED);

        assertThatThrownBy(() -> purchaseOrderService.receive(created.id(), "integration-stock-clerk"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Only a sent purchase order can be received");
        assertThat(stockMovementRepository.findByProductIdOrderByCreatedAtDesc(product.getId())).hasSize(1);
    }

    private List<Future<?>> receiveConcurrently(Long purchaseOrderId) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<?> first = pool.submit(() -> {
                ready.countDown();
                start.await();
                return purchaseOrderService.receive(purchaseOrderId, "integration-stock-clerk");
            });
            Future<?> second = pool.submit(() -> {
                ready.countDown();
                start.await();
                return purchaseOrderService.receive(purchaseOrderId, "integration-stock-clerk");
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
