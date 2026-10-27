-- Apply after V20261027_01 before deploying; production schema uses Hibernate ddl-auto=validate.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal_amount double precision NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS restaurant_order_id bigint;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_number varchar(32);

CREATE INDEX IF NOT EXISTS ix_sales_restaurant_order_id ON sales (restaurant_order_id);
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS sale_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS ux_restaurant_orders_sale_id ON restaurant_orders (sale_id) WHERE sale_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_sales_restaurant_order'
          AND table_name = 'sales'
    ) THEN
        ALTER TABLE sales ADD CONSTRAINT fk_sales_restaurant_order
            FOREIGN KEY (restaurant_order_id) REFERENCES restaurant_orders(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_restaurant_orders_sale'
          AND table_name = 'restaurant_orders'
    ) THEN
        ALTER TABLE restaurant_orders ADD CONSTRAINT fk_restaurant_orders_sale
            FOREIGN KEY (sale_id) REFERENCES sales(id);
    END IF;
END $$;
