-- Validate bounds before converting old floating-point monetary columns.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM product WHERE price IS NOT NULL AND abs(price::numeric) >= 100000000000000000) THEN
        RAISE EXCEPTION 'Product price exceeds numeric(19,2) range';
    END IF;
    IF EXISTS (
        SELECT 1 FROM sales
        WHERE abs(total_amount::numeric) >= 100000000000000000
           OR abs(subtotal_amount::numeric) >= 100000000000000000
           OR abs(tax_amount::numeric) >= 100000000000000000
           OR abs(amount_tendered::numeric) >= 100000000000000000
           OR abs(change_given::numeric) >= 100000000000000000
           OR abs(service_charge_amount::numeric) >= 100000000000000000
    ) THEN
        RAISE EXCEPTION 'Sale amount exceeds numeric(19,2) range';
    END IF;
    IF EXISTS (SELECT 1 FROM sale_item WHERE abs(price::numeric) >= 100000000000000000) THEN
        RAISE EXCEPTION 'Sale item price exceeds numeric(19,2) range';
    END IF;
    IF EXISTS (SELECT 1 FROM modifiers WHERE abs(additional_price::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM combos WHERE abs(price::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM order_items WHERE abs(unit_price::numeric) >= 100000000000000000 OR abs(line_total::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM restaurant_orders WHERE abs(subtotal::numeric) >= 100000000000000000 OR abs(tax_amount::numeric) >= 100000000000000000 OR abs(service_charge_amount::numeric) >= 100000000000000000 OR abs(discount_amount::numeric) >= 100000000000000000 OR abs(total::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM purchase_orders WHERE abs(total_amount::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM purchase_order_items WHERE abs(unit_cost::numeric) >= 100000000000000000 OR abs(line_total::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM customers WHERE abs(total_spent::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM shifts WHERE abs(opening_balance::numeric) >= 100000000000000000 OR abs(closing_balance::numeric) >= 100000000000000000 OR abs(expected_balance::numeric) >= 100000000000000000 OR abs(variance::numeric) >= 100000000000000000)
       OR EXISTS (SELECT 1 FROM expenses WHERE abs(amount::numeric) >= 100000000000000000) THEN
        RAISE EXCEPTION 'POS monetary value exceeds numeric(19,2) range';
    END IF;
END $$;

ALTER TABLE product
    ALTER COLUMN price TYPE numeric(19,2)
    USING CASE WHEN price IS NULL THEN NULL ELSE round(price::numeric, 2) END;

ALTER TABLE sales
    ALTER COLUMN total_amount TYPE numeric(19,2) USING round(total_amount::numeric, 2),
    ALTER COLUMN subtotal_amount TYPE numeric(19,2) USING round(subtotal_amount::numeric, 2),
    ALTER COLUMN tax_amount TYPE numeric(19,2) USING round(tax_amount::numeric, 2),
    ALTER COLUMN amount_tendered TYPE numeric(19,2) USING round(amount_tendered::numeric, 2),
    ALTER COLUMN change_given TYPE numeric(19,2) USING round(change_given::numeric, 2),
    ALTER COLUMN service_charge_amount TYPE numeric(19,2) USING round(service_charge_amount::numeric, 2);

ALTER TABLE sale_item
    ALTER COLUMN price TYPE numeric(19,2) USING round(price::numeric, 2);

ALTER TABLE modifiers
    ALTER COLUMN additional_price TYPE numeric(19,2) USING round(additional_price::numeric, 2);
ALTER TABLE combos
    ALTER COLUMN price TYPE numeric(19,2) USING CASE WHEN price IS NULL THEN NULL ELSE round(price::numeric, 2) END;
ALTER TABLE order_items
    ALTER COLUMN unit_price TYPE numeric(19,2) USING round(unit_price::numeric, 2),
    ALTER COLUMN line_total TYPE numeric(19,2) USING round(line_total::numeric, 2);
ALTER TABLE restaurant_orders
    ALTER COLUMN subtotal TYPE numeric(19,2) USING round(subtotal::numeric, 2),
    ALTER COLUMN tax_amount TYPE numeric(19,2) USING round(tax_amount::numeric, 2),
    ALTER COLUMN service_charge_amount TYPE numeric(19,2) USING round(service_charge_amount::numeric, 2),
    ALTER COLUMN discount_amount TYPE numeric(19,2) USING round(discount_amount::numeric, 2),
    ALTER COLUMN total TYPE numeric(19,2) USING round(total::numeric, 2);
ALTER TABLE purchase_orders
    ALTER COLUMN total_amount TYPE numeric(19,2) USING round(total_amount::numeric, 2);
ALTER TABLE purchase_order_items
    ALTER COLUMN unit_cost TYPE numeric(19,2) USING round(unit_cost::numeric, 2),
    ALTER COLUMN line_total TYPE numeric(19,2) USING round(line_total::numeric, 2);
ALTER TABLE customers
    ALTER COLUMN total_spent TYPE numeric(19,2) USING round(total_spent::numeric, 2);
ALTER TABLE shifts
    ALTER COLUMN opening_balance TYPE numeric(19,2) USING round(opening_balance::numeric, 2),
    ALTER COLUMN closing_balance TYPE numeric(19,2) USING CASE WHEN closing_balance IS NULL THEN NULL ELSE round(closing_balance::numeric, 2) END,
    ALTER COLUMN expected_balance TYPE numeric(19,2) USING CASE WHEN expected_balance IS NULL THEN NULL ELSE round(expected_balance::numeric, 2) END,
    ALTER COLUMN variance TYPE numeric(19,2) USING CASE WHEN variance IS NULL THEN NULL ELSE round(variance::numeric, 2) END;
ALTER TABLE expenses
    ALTER COLUMN amount TYPE numeric(19,2) USING round(amount::numeric, 2);
