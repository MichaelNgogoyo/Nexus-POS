ALTER TABLE product ADD COLUMN IF NOT EXISTS kitchen_station varchar(60);
UPDATE product SET kitchen_station = 'MAIN' WHERE kitchen_station IS NULL OR btrim(kitchen_station) = '';
ALTER TABLE product ALTER COLUMN kitchen_station SET DEFAULT 'MAIN';
ALTER TABLE product ALTER COLUMN kitchen_station SET NOT NULL;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_station varchar(60);
UPDATE order_items oi
SET kitchen_station = COALESCE(NULLIF(btrim(p.kitchen_station), ''), 'MAIN')
FROM product p
WHERE p.id = oi.product_id AND (oi.kitchen_station IS NULL OR btrim(oi.kitchen_station) = '');
UPDATE order_items SET kitchen_station = 'MAIN' WHERE kitchen_station IS NULL OR btrim(kitchen_station) = '';
ALTER TABLE order_items ALTER COLUMN kitchen_station SET DEFAULT 'MAIN';
ALTER TABLE order_items ALTER COLUMN kitchen_station SET NOT NULL;

ALTER TABLE kitchen_orders ADD COLUMN IF NOT EXISTS kitchen_station varchar(60);
UPDATE kitchen_orders SET kitchen_station = 'MAIN' WHERE kitchen_station IS NULL OR btrim(kitchen_station) = '';

DO $$
DECLARE unique_constraint record;
BEGIN
    FOR unique_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'kitchen_orders'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (order_id)'
    LOOP
        EXECUTE format('ALTER TABLE kitchen_orders DROP CONSTRAINT %I', unique_constraint.conname);
    END LOOP;
END $$;

-- Preserve existing tickets, splitting their history into one ticket per routed station.
WITH ranked_stations AS (
    SELECT k.id AS ticket_id,
           oi.kitchen_station,
           row_number() OVER (PARTITION BY k.id ORDER BY oi.kitchen_station) AS station_rank
    FROM kitchen_orders k
    JOIN order_items oi ON oi.order_id = k.order_id
    GROUP BY k.id, oi.kitchen_station
)
UPDATE kitchen_orders k
SET kitchen_station = ranked_stations.kitchen_station
FROM ranked_stations
WHERE ranked_stations.ticket_id = k.id AND ranked_stations.station_rank = 1;

WITH ranked_stations AS (
    SELECT k.id AS ticket_id,
           k.order_id,
           k.status,
           k.received_at,
           k.started_at,
           k.completed_at,
           k.notes,
           oi.kitchen_station,
           row_number() OVER (PARTITION BY k.id ORDER BY oi.kitchen_station) AS station_rank
    FROM kitchen_orders k
    JOIN order_items oi ON oi.order_id = k.order_id
    GROUP BY k.id, k.order_id, k.status, k.received_at, k.started_at, k.completed_at, k.notes, oi.kitchen_station
)
INSERT INTO kitchen_orders (order_id, status, received_at, started_at, completed_at, notes, kitchen_station)
SELECT order_id, status, received_at, started_at, completed_at, notes, kitchen_station
FROM ranked_stations
WHERE station_rank > 1;

ALTER TABLE kitchen_orders ALTER COLUMN kitchen_station SET DEFAULT 'MAIN';
ALTER TABLE kitchen_orders ALTER COLUMN kitchen_station SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_kitchen_orders_order_station ON kitchen_orders (order_id, kitchen_station);
CREATE INDEX IF NOT EXISTS ix_kitchen_orders_station_status ON kitchen_orders (kitchen_station, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_kitchen_orders_order_station ON kitchen_orders (order_id, kitchen_station)
    WHERE order_id IS NOT NULL;
