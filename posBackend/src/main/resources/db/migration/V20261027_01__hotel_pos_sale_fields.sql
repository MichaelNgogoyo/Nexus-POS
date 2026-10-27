-- Apply before deploying the hotel POS version; production uses Hibernate ddl-auto=validate.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_charge_amount double precision NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key varchar(64);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_type varchar(32);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS table_id bigint;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS room_number varchar(24);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS guest_name varchar(120);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes varchar(500);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_idempotency_key
    ON sales (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

ALTER TABLE restaurant_order ADD COLUMN IF NOT EXISTS room_number varchar(24);
ALTER TABLE restaurant_order ADD COLUMN IF NOT EXISTS service_charge_amount numeric(19,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_order ADD COLUMN IF NOT EXISTS idempotency_key varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS ux_restaurant_order_idempotency_key
    ON restaurant_order (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

ALTER TABLE sale_item ADD COLUMN IF NOT EXISTS notes varchar(250);
CREATE TABLE IF NOT EXISTS sale_item_modifiers (
    sale_item_id bigint NOT NULL REFERENCES sale_item(id) ON DELETE CASCADE,
    modifier_id bigint NOT NULL REFERENCES modifiers(id),
    PRIMARY KEY (sale_item_id, modifier_id)
);
CREATE TABLE IF NOT EXISTS order_item_modifiers (
    order_item_id bigint NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    modifier_id bigint NOT NULL REFERENCES modifiers(id),
    PRIMARY KEY (order_item_id, modifier_id)
);
