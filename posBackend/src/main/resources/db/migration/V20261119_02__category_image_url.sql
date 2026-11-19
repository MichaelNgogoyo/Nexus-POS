ALTER TABLE category
    ADD COLUMN IF NOT EXISTS image_url varchar(255);
