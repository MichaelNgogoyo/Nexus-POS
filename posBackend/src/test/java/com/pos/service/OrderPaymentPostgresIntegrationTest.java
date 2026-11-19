package com.pos.service;

import com.pos.dto.OrderPaymentRequest;
import com.pos.dto.RestaurantOrderItemRequest;
import com.pos.dto.RestaurantOrderRequest;
import com.pos.model.OrderStatus;
import com.pos.model.OrderType;
import com.pos.model.Modifier;
import com.pos.model.ModifierGroup;
import com.pos.model.Product;
import com.pos.model.Sales;
import com.pos.model.SaleItem;
import com.pos.model.SaleStatus;
import com.pos.model.Shift;
import com.pos.model.ShiftStatus;
import com.pos.controller.KitchenController;
import com.pos.repository.KitchenOrderRepository;
import com.pos.repository.ModifierGroupRepository;
import com.pos.repository.ModifierRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.RestaurantOrderRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.ShiftRepository;
import com.pos.repository.StockMovementRepository;
import com.pos.service.impl.SalesService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    com.pos.service.impl.ReportService reportService;

    @Autowired
    ProductRepository productRepository;

    @Autowired
    RestaurantOrderRepository orderRepository;

    @Autowired
    SalesRepository salesRepository;

    @Autowired
    KitchenOrderRepository kitchenOrderRepository;

    @Autowired
    ModifierGroupRepository modifierGroupRepository;

    @Autowired
    ModifierRepository modifierRepository;

    @Autowired
    KitchenController kitchenController;

    @Autowired
    StockMovementRepository stockMovementRepository;

    @Autowired
    ShiftRepository shiftRepository;

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

        Shift openShift = shiftRepository.saveAndFlush(Shift.builder().cashierId("integration-cashier")
                .openingBalance(new BigDecimal("50.00")).status(ShiftStatus.OPEN).build());

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
        assertThat(sale.getShiftId()).isEqualTo(openShift.getId());
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

    @Test
    void kitchenQueueLoadsModifiersAfterRepositorySessionCloses() {
        Product product = productRepository.saveAndFlush(Product.builder()
                .name("Integration modifiable dish")
                .price(new BigDecimal("100.00"))
                .active(true)
                .quantity(5)
                .build());
        ModifierGroup group = modifierGroupRepository.saveAndFlush(ModifierGroup.builder()
                .name("Preparation")
                .product(product)
                .modifiers(new java.util.ArrayList<>())
                .build());
        Modifier modifier = modifierRepository.saveAndFlush(Modifier.builder().name("Extra avocado")
                .additionalPrice(new BigDecimal("50.00")).available(true).group(group).build());
        Long modifierId = modifier.getId();
        assertThat(modifierId).isNotNull();
        assertThat(modifierGroupRepository.findByProductId(product.getId())).singleElement()
                .satisfies(savedGroup -> assertThat(savedGroup.getModifiers()).extracting(Modifier::getId)
                        .containsExactly(modifierId));

        RestaurantOrderRequest request = new RestaurantOrderRequest(
                OrderType.TAKEAWAY,
                "integration-kitchen-modifier-key-01",
                null,
                null,
                null,
                "Kitchen modifier check",
                List.of(new RestaurantOrderItemRequest(product.getId(), 1, "Well done",
                        List.of(new RestaurantOrderItemRequest.ModifierReference(modifierId)))));
        RestaurantOrderService.CreateResult created = orderService.createAndSubmitOrder(request, "integration-cashier");
        assertThat(created.order().items().get(0).modifiers()).extracting(com.pos.dto.RestaurantOrderResponse.ModifierResponse::name)
                .containsExactly("Extra avocado");

        var originalAuthentication = SecurityContextHolder.getContext().getAuthentication();
        try {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    "integration-kitchen", "", List.of(new SimpleGrantedAuthority("ROLE_CASHIER"))));
            var tickets = kitchenController.getAllKitchenOrders(null, false);
            var ticket = tickets.stream().filter(candidate -> candidate.order() != null
                    && candidate.order().id().equals(created.order().id())).findFirst().orElseThrow();

            assertThat(ticket.order().items().get(0).notes()).isEqualTo("Well done");
            assertThat(ticket.order().items().get(0).modifiers()).extracting(com.pos.dto.KitchenTicketResponse.ModifierSummary::name)
                    .containsExactly("Extra avocado");
        } finally {
            SecurityContextHolder.clearContext();
            if (originalAuthentication != null) {
                SecurityContextHolder.getContext().setAuthentication(originalAuthentication);
            }
        }
    }

    @Test
    @Transactional
    void analyticsAggregatesRunAgainstPostgresAndIncludeActiveSlowMovingProducts() {
        Product soldProduct = productRepository.saveAndFlush(Product.builder().name("Analytics sold tea")
                .price(new BigDecimal("100.00")).costPrice(new BigDecimal("25.00"))
                .active(true).quantity(4).lowStockThreshold(2).build());
        Product slowProduct = productRepository.saveAndFlush(Product.builder().name("Analytics unsold juice")
                .price(new BigDecimal("80.00")).costPrice(new BigDecimal("20.00"))
                .active(true).quantity(3).lowStockThreshold(2).build());
        LocalDateTime soldAt = LocalDateTime.now();
        Sales sale = Sales.builder().cashierId("analytics-cashier").totalAmount(new BigDecimal("110.00"))
                .subtotalAmount(new BigDecimal("100.00")).taxAmount(new BigDecimal("10.00"))
                .serviceChargeAmount(BigDecimal.ZERO).amountTendered(new BigDecimal("110.00"))
                .changeGiven(BigDecimal.ZERO).paymentMethod("CASH").status(SaleStatus.COMPLETED)
                .createdAt(soldAt).saleItems(new ArrayList<>()).build();
        SaleItem item = SaleItem.builder().product(soldProduct).quantity(1)
                .price(new BigDecimal("100.00")).sales(sale).build();
        sale.getSaleItems().add(item);
        salesRepository.saveAndFlush(sale);

        LocalDate today = soldAt.toLocalDate();
        var analytics = reportService.getAnalytics(today, today);

        assertThat(analytics.sales().revenue()).isEqualByComparingTo("110.00");
        assertThat(analytics.sales().taxCollected()).isEqualByComparingTo("10.00");
        assertThat(analytics.profit().netSalesRevenue()).isEqualByComparingTo("100.00");
        assertThat(analytics.products()).anySatisfy(product -> {
            assertThat(product.productId()).isEqualTo(soldProduct.getId());
            assertThat(product.unitsSold()).isEqualTo(1);
            assertThat(product.estimatedCost()).isEqualByComparingTo("25.00");
        });
        assertThat(analytics.products()).anySatisfy(product -> {
            assertThat(product.productId()).isEqualTo(slowProduct.getId());
            assertThat(product.unitsSold()).isZero();
        });
        assertThat(analytics.hourly()).hasSize(24);
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
