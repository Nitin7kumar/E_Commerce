-- =====================================================
-- MIGRATION 022: Fix Infinite RLS Recursion on order_items
-- =====================================================
-- PROBLEM:
--   Error 42P17: "infinite recursion detected in policy for
--   relation order_items"
--
--   The seller policy on order_items queries `products`,
--   and the seller policy on `products` queries `sellers`,
--   which triggers cascading RLS evaluations that loop back.
--
-- SOLUTION:
--   Replace the recursive policy with one that uses the
--   SECURITY DEFINER function get_my_seller_id() (from 007),
--   which bypasses RLS when looking up the seller ID.
--   Then do a direct join on products.seller_id without
--   touching the sellers table at all.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- =====================================================

BEGIN;

-- 1. Drop BOTH conflicting seller policies on order_items
DROP POLICY IF EXISTS "Sellers can view order items for their products" ON order_items;
DROP POLICY IF EXISTS "Sellers view their own items" ON order_items;

-- 2. Create a single, non-recursive seller policy
--    Uses get_my_seller_id() (SECURITY DEFINER) to get the
--    seller's ID without triggering RLS on the sellers table.
--    Then checks products.seller_id directly — products has
--    "Public can view active products" which is simple and safe.
CREATE POLICY "Sellers view their order items"
  ON order_items FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE seller_id = get_my_seller_id()
    )
  );

-- 3. Also fix the 021 policy on orders table (same pattern)
DROP POLICY IF EXISTS "Sellers view orders with their products" ON orders;

CREATE POLICY "Sellers view orders with their products"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM order_items oi
      WHERE oi.order_id = orders.id
        AND oi.product_id IN (
          SELECT id FROM products
          WHERE seller_id = get_my_seller_id()
        )
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT policyname, cmd
FROM pg_policies
WHERE tablename IN ('order_items', 'orders')
ORDER BY tablename, policyname;

COMMIT;

SELECT '✅ Fixed infinite RLS recursion on order_items!' AS status;
