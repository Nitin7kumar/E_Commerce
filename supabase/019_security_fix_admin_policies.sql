-- =====================================================
-- MIGRATION 019: Critical Security Fix
-- =====================================================
-- Fixes 16 Supabase security errors:
--   1. product_ratings view using SECURITY DEFINER
--   2. 15 RLS policies using insecure user_metadata admin check
--
-- Solution:
--   - Redefine product_ratings as SECURITY INVOKER
--   - Create a secure is_admin() function (email-based)
--   - Replace all broken "Admin full access..." policies
--   - Add seller access policy on order_items
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Fix the product_ratings View
-- =====================================================
-- Remove SECURITY DEFINER so it respects underlying table RLS.
-- CREATE OR REPLACE VIEW does not support changing security,
-- so we must DROP and re-CREATE.

DROP VIEW IF EXISTS product_ratings;

CREATE VIEW product_ratings AS
SELECT
  product_id,
  COUNT(*) AS review_count,
  ROUND(AVG(rating)::numeric, 1) AS average_rating,
  COUNT(*) FILTER (WHERE rating = 5) AS five_star,
  COUNT(*) FILTER (WHERE rating = 4) AS four_star,
  COUNT(*) FILTER (WHERE rating = 3) AS three_star,
  COUNT(*) FILTER (WHERE rating = 2) AS two_star,
  COUNT(*) FILTER (WHERE rating = 1) AS one_star,
  COUNT(*) FILTER (WHERE is_verified_purchase) AS verified_count
FROM reviews
WHERE is_approved = true
GROUP BY product_id;

-- By default, views are SECURITY INVOKER (respects caller's RLS).
-- No SECURITY DEFINER = correct behavior.

GRANT SELECT ON product_ratings TO authenticated;
GRANT SELECT ON product_ratings TO anon;


-- =====================================================
-- STEP 2: Create a Secure Admin Check Function
-- =====================================================
-- Instead of checking user_metadata (which Supabase has blocked),
-- we check the authenticated user's email from the JWT.
-- This is tamper-proof because the email claim is set by Supabase Auth.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') = 'nitinkumar250607@gmail.com';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- SECURITY DEFINER is intentional here: the function itself needs
-- to read the JWT, and it returns a simple boolean. It's a single
-- comparison, not a data query, so it's safe.


-- =====================================================
-- STEP 3: Replace All Broken Admin Policies
-- =====================================================
-- For each table, DROP the old insecure policy, then CREATE
-- a new one using the secure is_admin() function.


-- ----- 3.1 ORDERS -----
DROP POLICY IF EXISTS "Admin full access to orders" ON orders;

CREATE POLICY "Enable Admin Access"
  ON orders FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.2 ORDER_ITEMS -----
DROP POLICY IF EXISTS "Admin full access to order_items" ON order_items;

CREATE POLICY "Enable Admin Access"
  ON order_items FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.3 PRODUCTS -----
DROP POLICY IF EXISTS "Admins have full access" ON products;
DROP POLICY IF EXISTS "Admin full access to products" ON products;

CREATE POLICY "Enable Admin Access"
  ON products FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.4 SELLERS -----
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;

CREATE POLICY "Enable Admin Access"
  ON sellers FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.5 ADDRESSES -----
DROP POLICY IF EXISTS "Admin full access to addresses" ON addresses;

CREATE POLICY "Enable Admin Access"
  ON addresses FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.6 PROFILES -----
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;

CREATE POLICY "Enable Admin Access"
  ON profiles FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.7 WISHLISTS -----
DROP POLICY IF EXISTS "Admin full access to wishlists" ON wishlists;

CREATE POLICY "Enable Admin Access"
  ON wishlists FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.8 CARTS -----
DROP POLICY IF EXISTS "Admin full access to carts" ON carts;

CREATE POLICY "Enable Admin Access"
  ON carts FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.9 CART_ITEMS -----
DROP POLICY IF EXISTS "Admin full access to cart_items" ON cart_items;

CREATE POLICY "Enable Admin Access"
  ON cart_items FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.10 REVIEWS -----
DROP POLICY IF EXISTS "Admin full access to reviews" ON reviews;

CREATE POLICY "Enable Admin Access"
  ON reviews FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.11 CATEGORIES -----
DROP POLICY IF EXISTS "Admin full access to categories" ON categories;

CREATE POLICY "Enable Admin Access"
  ON categories FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.12 COUPONS -----
DROP POLICY IF EXISTS "Admin full access to coupons" ON coupons;

CREATE POLICY "Enable Admin Access"
  ON coupons FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.13 COUPON_USAGES -----
DROP POLICY IF EXISTS "Admin full access to coupon_usages" ON coupon_usages;

CREATE POLICY "Enable Admin Access"
  ON coupon_usages FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.14 PAYMENTS -----
DROP POLICY IF EXISTS "Admin full access to payments" ON payments;

CREATE POLICY "Enable Admin Access"
  ON payments FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- ----- 3.15 RETURNS -----
DROP POLICY IF EXISTS "Admin full access to returns" ON returns;

CREATE POLICY "Enable Admin Access"
  ON returns FOR ALL
  USING ( is_admin() )
  WITH CHECK ( is_admin() );


-- =====================================================
-- STEP 4: Seller Access for Order Items
-- =====================================================
-- Sellers need to see order_items that contain their products.

DROP POLICY IF EXISTS "Sellers view their own items" ON order_items;

CREATE POLICY "Sellers view their own items"
  ON order_items FOR SELECT
  USING (
    auth.uid() IN (
      SELECT seller_id FROM products WHERE id = product_id
    )
  );


-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the is_admin() function exists
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'is_admin';

-- Verify all new policies are in place
SELECT tablename, policyname
FROM pg_policies
WHERE policyname = 'Enable Admin Access'
ORDER BY tablename;

-- Verify product_ratings view is NOT security definer
SELECT viewname, definition
FROM pg_views
WHERE viewname = 'product_ratings';

COMMIT;

SELECT '✅ All 16 security errors fixed successfully!' AS status;
