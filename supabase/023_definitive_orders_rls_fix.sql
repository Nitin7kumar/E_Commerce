-- =====================================================
-- MIGRATION 023: DEFINITIVE FIX — Orders & Order Items RLS
-- =====================================================
-- 
-- PROBLEM: infinite recursion (42P17) on order_items table
-- caused by overlapping RLS policies from migrations
-- 007, 019, and 022 creating circular dependencies.
--
-- THIS MIGRATION:
--   1. Drops ALL existing policies on orders & order_items
--   2. Creates a SECURITY DEFINER helper to break recursion
--   3. Recreates clean, non-recursive policies for:
--      - Regular users (view/create own)
--      - Admin (full access via is_admin())
--      - Sellers (view items for their products)
--
-- ⚠️  RUN THIS IN: Supabase Dashboard → SQL Editor
-- ⚠️  This REPLACES migrations 021 and 022 — skip those.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES on orders & order_items
-- =====================================================
-- Clean slate — remove every policy regardless of name

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all policies on orders
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON orders', pol.policyname);
  END LOOP;

  -- Drop all policies on order_items
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'order_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', pol.policyname);
  END LOOP;
END $$;


-- =====================================================
-- STEP 2: SECURITY DEFINER helper function
-- =====================================================
-- This function checks if an order contains products
-- belonging to the current user's seller account.
-- SECURITY DEFINER = bypasses RLS, breaking the recursion chain.

CREATE OR REPLACE FUNCTION seller_owns_order_item(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM products p
    JOIN sellers s ON s.id = p.seller_id
    WHERE p.id = p_product_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
   SET search_path = 'public', 'pg_temp';

-- Helper: check if an order has at least one item from the current seller
CREATE OR REPLACE FUNCTION seller_has_items_in_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN sellers s ON s.id = p.seller_id
    WHERE oi.order_id = p_order_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
   SET search_path = 'public', 'pg_temp';


-- =====================================================
-- STEP 3: ORDERS POLICIES (clean set)
-- =====================================================

-- 3a. Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- 3b. Users can create their own orders
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3c. Users can update own pending/confirmed orders
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('pending', 'confirmed')
  );

-- 3d. Admin full access (uses is_admin() from migration 019)
CREATE POLICY "Admin full access orders"
  ON orders FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );

-- 3e. Sellers can view orders containing their products
--     Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Sellers view their orders"
  ON orders FOR SELECT
  USING ( seller_has_items_in_order(id) );


-- =====================================================
-- STEP 4: ORDER_ITEMS POLICIES (clean set)
-- =====================================================

-- 4a. Users can view their own order items
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM orders WHERE id = order_id
    )
  );

-- 4b. Users can create order items for their own orders
CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM orders WHERE id = order_id
    )
  );

-- 4c. Admin full access
CREATE POLICY "Admin full access order items"
  ON order_items FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );

-- 4d. Sellers can view order items for their products
--     Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Sellers view their order items"
  ON order_items FOR SELECT
  USING ( seller_owns_order_item(product_id) );


-- =====================================================
-- STEP 5: VERIFY
-- =====================================================

-- Show all policies on orders
SELECT 'orders' AS "table", policyname, cmd
FROM pg_policies WHERE tablename = 'orders'
ORDER BY policyname;

-- Show all policies on order_items  
SELECT 'order_items' AS "table", policyname, cmd
FROM pg_policies WHERE tablename = 'order_items'
ORDER BY policyname;

COMMIT;

SELECT '✅ Orders & order_items RLS policies fixed! No more recursion.' AS status;
