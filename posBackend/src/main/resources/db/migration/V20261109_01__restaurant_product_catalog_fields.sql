ALTER TABLE product
    ADD COLUMN IF NOT EXISTS description varchar(500),
    ADD COLUMN IF NOT EXISTS cost_price numeric(19, 2),
    ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;
