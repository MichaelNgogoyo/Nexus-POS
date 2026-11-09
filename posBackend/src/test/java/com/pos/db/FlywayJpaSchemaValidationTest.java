package com.pos.db;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.profiles.active=integration",
        "spring.jpa.hibernate.ddl-auto=validate",
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
class FlywayJpaSchemaValidationTest {

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
    Flyway flyway;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void flywayCreatesASchemaThatHibernateCanValidate() {
        assertThat(flyway.info().current()).isNotNull();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("20261030.01");
    }

    @Test
    void migrationRepairsLegacyOrderSaleTablesMissingLinkColumns() {
        jdbcTemplate.execute("ALTER TABLE restaurant_orders DROP CONSTRAINT IF EXISTS fk_restaurant_orders_sale");
        jdbcTemplate.execute("ALTER TABLE sales DROP CONSTRAINT IF EXISTS fk_sales_restaurant_order");
        jdbcTemplate.execute("ALTER TABLE restaurant_orders DROP COLUMN IF EXISTS sale_id");
        jdbcTemplate.execute("ALTER TABLE sales DROP COLUMN IF EXISTS restaurant_order_id");
        jdbcTemplate.execute("DROP TABLE flyway_schema_history");

        flyway.migrate();

        assertThat(hasColumn("restaurant_orders", "sale_id")).isTrue();
        assertThat(hasColumn("sales", "restaurant_order_id")).isTrue();
        assertThat(hasConstraint("restaurant_orders", "fk_restaurant_orders_sale")).isTrue();
        assertThat(hasConstraint("sales", "fk_sales_restaurant_order")).isTrue();
    }

    private boolean hasColumn(String table, String column) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                        + "WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?)",
                Boolean.class, table, column));
    }

    private boolean hasConstraint(String table, String constraint) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM pg_constraint "
                        + "WHERE conname = ? AND conrelid = to_regclass(current_schema() || '.' || ?))",
                Boolean.class, constraint, table));
    }
}
