-- =====================================================
-- PHASE 18: AUTO-DECREMENT PRODUCT STOCK ON ORDER
-- =====================================================
--
-- PURPOSE:
--   Automatically reduce product stock when a new order_item
--   is inserted. This keeps inventory accurate without relying
--   on application-level logic.
--
-- RELATIONSHIP:
--   order_items.product_id  →  products.id
--   order_items.quantity     →  amount to decrement
--
-- SAFETY:
--   1. products.stock already has CHECK (stock >= 0) from 001_products_table.sql
--   2. The function raises an EXCEPTION if stock would go negative,
--      which aborts the entire transaction (order + items).
--   3. Uses FOR UPDATE row-lock to prevent race conditions
--      under concurrent orders.
--
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR (Dashboard > SQL Editor)
-- =====================================================


-- =====================================================
-- STEP 1: SAFETY CHECK — Ensure stock >= 0 constraint exists
-- =====================================================
-- This is idempotent. If the constraint already exists (it does
-- from 001_products_table.sql), this block safely does nothing.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name ILIKE '%products_stock_check%'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
    RAISE NOTICE '✅ Added CHECK (stock >= 0) constraint to products.';
  ELSE
    RAISE NOTICE 'ℹ️  CHECK (stock >= 0) constraint already exists. Skipping.';
  END IF;
END $$;


-- =====================================================
-- STEP 2: Create the decrement_stock() function
-- =====================================================
-- Triggers AFTER INSERT on order_items.
--
-- Design decisions:
--   • SELECT ... FOR UPDATE: Acquires a row-level lock on the
--     product row to prevent two concurrent orders from both
--     reading the same stock value (race condition).
--   • RAISE EXCEPTION on insufficient stock: This rolls back
--     the entire transaction, so neither the order nor the
--     order_item is persisted — atomic consistency.
--   • Guards against NULL product_id (ON DELETE SET NULL in
--     order_items means product_id can be NULL for deleted products).

CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Guard: If product_id is NULL (product was deleted), skip.
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lock the product row and read current stock
  SELECT stock INTO current_stock
  FROM products
  WHERE id = NEW.product_id
  FOR UPDATE;

  -- Guard: Product not found (shouldn't happen with FK, but defensive)
  IF NOT FOUND THEN
    RAISE WARNING 'decrement_stock: product_id % not found. Skipping.', NEW.product_id;
    RETURN NEW;
  END IF;

  -- Guard: Insufficient stock → abort the entire transaction
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
      NEW.product_id, current_stock, NEW.quantity;
  END IF;

  -- Decrement stock
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- STEP 3: Create the trigger on order_items
-- =====================================================
-- AFTER INSERT: We decrement stock after the order_item row
-- is successfully inserted. If the function raises an exception,
-- PostgreSQL rolls back both the INSERT and the UPDATE atomically.

DROP TRIGGER IF EXISTS on_order_item_created ON order_items;

CREATE TRIGGER on_order_item_created
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock();


-- =====================================================
-- VERIFICATION QUERIES (run these to test)
-- =====================================================

-- 1. Confirm trigger exists:
-- SELECT tgname, tgrelid::regclass, tgtype
-- FROM pg_trigger
-- WHERE tgname = 'on_order_item_created';

-- 2. Confirm function exists:
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname = 'decrement_stock';

-- 3. Test with a dry run (replace UUIDs with real ones):
-- BEGIN;
--   INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, total_price)
--   VALUES ('<order-uuid>', '<product-uuid>', 'Test Product', 499.00, 2, 998.00);
--
--   -- Check: stock should be reduced by 2
--   SELECT id, name, stock FROM products WHERE id = '<product-uuid>';
-- ROLLBACK;  -- undo test
