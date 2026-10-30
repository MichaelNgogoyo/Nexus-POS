package com.pos.db;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import org.postgresql.ds.PGSimpleDataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class MoneyMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void migratesKeycloakSharedAndLegacySchemasWithoutDroppingMoneyData() throws Exception {
        String schema = "pos_migration_test";
        try (Connection connection = connection(null); Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            statement.execute("CREATE TABLE " + schema + ".keycloak_marker (id integer primary key)");
            statement.execute("INSERT INTO " + schema + ".keycloak_marker VALUES (1)");
        }

        DataSource dataSource = dataSource(schema);
        migrate(dataSource, schema);

        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            // Simulate an older Hibernate-created deployment with floating-point money columns.
            statement.execute("ALTER TABLE product ALTER COLUMN price TYPE double precision USING price::double precision");
            statement.execute("ALTER TABLE sale_item ALTER COLUMN price TYPE double precision USING price::double precision");
            statement.execute("ALTER TABLE sales "
                    + "ALTER COLUMN total_amount TYPE double precision USING total_amount::double precision, "
                    + "ALTER COLUMN subtotal_amount TYPE double precision USING subtotal_amount::double precision, "
                    + "ALTER COLUMN tax_amount TYPE double precision USING tax_amount::double precision, "
                    + "ALTER COLUMN amount_tendered TYPE double precision USING amount_tendered::double precision, "
                    + "ALTER COLUMN change_given TYPE double precision USING change_given::double precision, "
                    + "ALTER COLUMN service_charge_amount TYPE double precision USING service_charge_amount::double precision");
            statement.execute("INSERT INTO product (name, price, active, discount, quantity, low_stock_threshold) "
                    + "VALUES ('legacy soup', 12.345, true, 0, 9, 5)");
            statement.execute("INSERT INTO sales (amount_tendered, change_given, service_charge_amount, subtotal_amount, "
                    + "tax_amount, total_amount, status, payment_method) "
                    + "VALUES (20.005, 7.655, 1.115, 10.005, 1.605, 12.725, 'COMPLETED', 'CASH')");
            statement.execute("INSERT INTO sale_item (price, quantity, product_id, sale_id) "
                    + "VALUES (12.345, 1, (SELECT id FROM product WHERE name='legacy soup'), "
                    + "(SELECT id FROM sales WHERE payment_method='CASH'))");
            statement.execute("DROP TABLE " + schema + ".flyway_schema_history");
        }

        migrate(dataSource, schema);

        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            assertMoneyColumn(statement, "product", "price");
            assertMoneyColumn(statement, "sales", "total_amount");
            assertMoneyColumn(statement, "sales", "subtotal_amount");
            assertMoneyColumn(statement, "sales", "service_charge_amount");
            assertMoneyColumn(statement, "sale_item", "price");
            assertMoneyColumn(statement, "modifiers", "additional_price");
            assertMoneyColumn(statement, "combos", "price");
            assertMoneyColumn(statement, "order_items", "unit_price");
            assertMoneyColumn(statement, "restaurant_orders", "total");
            assertMoneyColumn(statement, "purchase_orders", "total_amount");
            assertMoneyColumn(statement, "purchase_order_items", "unit_cost");
            assertMoneyColumn(statement, "customers", "total_spent");
            assertMoneyColumn(statement, "shifts", "opening_balance");
            assertMoneyColumn(statement, "expenses", "amount");
            assertThat(decimalValue(statement, "SELECT price FROM product WHERE name='legacy soup'"))
                    .isEqualByComparingTo("12.35");
            assertThat(decimalValue(statement, "SELECT total_amount FROM sales WHERE payment_method='CASH'"))
                    .isEqualByComparingTo("12.73");
            assertThat(decimalValue(statement, "SELECT amount_tendered FROM sales WHERE payment_method='CASH'"))
                    .isEqualByComparingTo("20.01");
            assertThat(decimalValue(statement, "SELECT price FROM sale_item"))
                    .isEqualByComparingTo("12.35");
            assertThat(scalar(statement, "SELECT count(*) FROM keycloak_marker")).isEqualTo(1L);
        }
    }

    private void migrate(DataSource dataSource, String schema) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .schemas(schema)
                .defaultSchema(schema)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load()
                .migrate();
    }

    private DataSource dataSource(String schema) {
        PGSimpleDataSource dataSource = new PGSimpleDataSource();
        dataSource.setURL(POSTGRES.getJdbcUrl());
        dataSource.setUser(POSTGRES.getUsername());
        dataSource.setPassword(POSTGRES.getPassword());
        dataSource.setCurrentSchema(schema);
        return dataSource;
    }

    private Connection connection(String schema) throws Exception {
        PGSimpleDataSource dataSource = new PGSimpleDataSource();
        dataSource.setURL(POSTGRES.getJdbcUrl());
        dataSource.setUser(POSTGRES.getUsername());
        dataSource.setPassword(POSTGRES.getPassword());
        if (schema != null) dataSource.setCurrentSchema(schema);
        return dataSource.getConnection();
    }

    private void assertMoneyColumn(Statement statement, String table, String column) throws Exception {
        try (ResultSet result = statement.executeQuery("SELECT data_type, numeric_precision, numeric_scale "
                + "FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='" + table
                + "' AND column_name='" + column + "'")) {
            assertThat(result.next()).as(table + "." + column + " exists").isTrue();
            assertThat(result.getString("data_type")).isEqualTo("numeric");
            assertThat(result.getInt("numeric_precision")).isEqualTo(19);
            assertThat(result.getInt("numeric_scale")).isEqualTo(2);
        }
    }

    private BigDecimal decimalValue(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getBigDecimal(1);
        }
    }

    private long scalar(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }
}
