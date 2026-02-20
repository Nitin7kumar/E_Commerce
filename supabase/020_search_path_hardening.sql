-- =====================================================
-- MIGRATION 020: Security Hardening
-- =====================================================
-- Fixes:
--   1. CRITICAL: product_ratings view — remove SECURITY DEFINER
--   2. WARNINGS (21): Lock search_path on all custom functions
--      to prevent schema-hijacking attacks.
--
-- WHY search_path matters:
--   If search_path is mutable, an attacker who can create objects
--   in a schema earlier in the path can shadow public.* objects
--   and execute arbitrary code inside SECURITY DEFINER functions.
--   Setting search_path = 'public, pg_temp' locks resolution to
--   known-safe schemas only.
--
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- =====================================================

BEGIN;


-- =====================================================
-- STEP 1: Fix the product_ratings View (Critical)
-- =====================================================
-- The view was created with SECURITY DEFINER, which means it
-- executes with the permissions of the view OWNER (typically
-- postgres), bypassing RLS on the underlying `reviews` table.
-- Re-creating without SECURITY DEFINER makes it SECURITY INVOKER
-- (the default), so it respects the caller's RLS policies.

DROP VIEW IF EXISTS "public"."product_ratings";

CREATE VIEW "public"."product_ratings" AS
SELECT
  product_id,
  COUNT(*)                                        AS review_count,
  ROUND(AVG(rating)::numeric, 1)                  AS average_rating,
  COUNT(*) FILTER (WHERE rating = 5)              AS five_star,
  COUNT(*) FILTER (WHERE rating = 4)              AS four_star,
  COUNT(*) FILTER (WHERE rating = 3)              AS three_star,
  COUNT(*) FILTER (WHERE rating = 2)              AS two_star,
  COUNT(*) FILTER (WHERE rating = 1)              AS one_star,
  COUNT(*) FILTER (WHERE is_verified_purchase)    AS verified_count
FROM "public"."reviews"
WHERE is_approved = true
GROUP BY product_id;

-- Restore grants
GRANT SELECT ON "public"."product_ratings" TO authenticated;
GRANT SELECT ON "public"."product_ratings" TO anon;


-- =====================================================
-- STEP 2: Lock search_path on ALL Custom Functions
-- =====================================================
-- Setting search_path = 'public, pg_temp' ensures that function
-- body references (like table names) always resolve to the public
-- schema, closing the schema-hijacking vector.
--
-- pg_temp is included so temporary tables still work if needed,
-- but it is searched AFTER public, so it cannot shadow public objects.
-- =====================================================


-- ----- 1. decrement_stock() -----
ALTER FUNCTION "public"."decrement_stock"()
  SET search_path = 'public', 'pg_temp';

-- ----- 2. is_admin() -----
ALTER FUNCTION "public"."is_admin"()
  SET search_path = 'public', 'pg_temp';

-- ----- 3. prevent_seller_status_change() -----
ALTER FUNCTION "public"."prevent_seller_status_change"()
  SET search_path = 'public', 'pg_temp';

-- ----- 4. is_active_seller() -----
ALTER FUNCTION "public"."is_active_seller"()
  SET search_path = 'public', 'pg_temp';

-- ----- 5. get_my_seller_id() -----
ALTER FUNCTION "public"."get_my_seller_id"()
  SET search_path = 'public', 'pg_temp';

-- ----- 6. compute_category_path() -----
ALTER FUNCTION "public"."compute_category_path"()
  SET search_path = 'public', 'pg_temp';

-- ----- 7. validate_coupon(TEXT, UUID, NUMERIC) -----
ALTER FUNCTION "public"."validate_coupon"(text, uuid, numeric)
  SET search_path = 'public', 'pg_temp';

-- ----- 8. generate_return_number() -----
ALTER FUNCTION "public"."generate_return_number"()
  SET search_path = 'public', 'pg_temp';

-- ----- 9. get_cart_total(UUID) -----
ALTER FUNCTION "public"."get_cart_total"(uuid)
  SET search_path = 'public', 'pg_temp';

-- ----- 10. update_seller_stats() -----
ALTER FUNCTION "public"."update_seller_stats"()
  SET search_path = 'public', 'pg_temp';

-- ----- 11. handle_new_user() -----
ALTER FUNCTION "public"."handle_new_user"()
  SET search_path = 'public', 'pg_temp';

-- ----- 12. create_seller_on_signup() -----
ALTER FUNCTION "public"."create_seller_on_signup"()
  SET search_path = 'public', 'pg_temp';

-- ----- 13. update_inventory_on_order() -----
ALTER FUNCTION "public"."update_inventory_on_order"()
  SET search_path = 'public', 'pg_temp';

-- ----- 14. update_updated_at() -----
ALTER FUNCTION "public"."update_updated_at"()
  SET search_path = 'public', 'pg_temp';

-- ----- 15. generate_request_number() -----
ALTER FUNCTION "public"."generate_request_number"()
  SET search_path = 'public', 'pg_temp';

-- ----- 16. update_product_rating_summary() -----
ALTER FUNCTION "public"."update_product_rating_summary"()
  SET search_path = 'public', 'pg_temp';

-- ----- 17. generate_order_number() -----
ALTER FUNCTION "public"."generate_order_number"()
  SET search_path = 'public', 'pg_temp';

-- ----- 18. update_rating_helpful_count() -----
ALTER FUNCTION "public"."update_rating_helpful_count"()
  SET search_path = 'public', 'pg_temp';

-- ----- 19. set_return_replace_eligibility() -----
ALTER FUNCTION "public"."set_return_replace_eligibility"()
  SET search_path = 'public', 'pg_temp';

-- ----- 20. add_return_timeline_entry() -----
ALTER FUNCTION "public"."add_return_timeline_entry"()
  SET search_path = 'public', 'pg_temp';

-- ----- 21. update_updated_at_column() -----
ALTER FUNCTION "public"."update_updated_at_column"()
  SET search_path = 'public', 'pg_temp';


-- =====================================================
-- VERIFICATION
-- =====================================================

-- 1. Confirm product_ratings is NOT security definer
SELECT
  viewname,
  'SECURITY INVOKER (safe)' AS security_mode
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'product_ratings';

-- 2. Confirm all functions now have search_path locked
SELECT
  p.proname                                     AS function_name,
  pg_catalog.array_to_string(p.proconfig, ', ') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'decrement_stock',
    'is_admin',
    'prevent_seller_status_change',
    'is_active_seller',
    'get_my_seller_id',
    'compute_category_path',
    'validate_coupon',
    'generate_return_number',
    'get_cart_total',
    'update_seller_stats',
    'handle_new_user',
    'create_seller_on_signup',
    'update_inventory_on_order',
    'update_updated_at',
    'generate_request_number',
    'update_product_rating_summary',
    'generate_order_number',
    'update_rating_helpful_count',
    'set_return_replace_eligibility',
    'add_return_timeline_entry',
    'update_updated_at_column'
  )
ORDER BY p.proname;

COMMIT;

SELECT '✅ View fixed + 21 function search_paths hardened!' AS status;
