-- =====================================================
-- PHASE 2: SELLER SYSTEM - Marketplace Foundation
-- =====================================================
--
-- This migration introduces the seller system for the marketplace.
-- 
-- KEY DESIGN DECISIONS:
--
-- 1. SELLER TABLE DESIGN
--    - Sellers are linked to Supabase Auth users (user_id)
--    - Admin creates and manages sellers (no self-registration)
--    - is_active controls whether seller can operate
--    - store_name and store_description for branding
--
-- 2. PRODUCT OWNERSHIP
--    - Products now have seller_id (nullable for backward compatibility)
--    - Products without seller_id are considered "platform" products
--    - Sellers can only manage their own products
--
-- 3. SECURITY MODEL (RLS)
--    - Admin: Full access to everything (already has is_admin in JWT)
--    - Seller: Can only manage their own products + view their order_items
--    - User: Read-only access to active products
--
-- 4. NO SELF-REGISTRATION
--    - Sellers CANNOT insert themselves into sellers table
--    - Only admin can create seller records
--    - Sellers cannot modify their own is_active status
--
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR (Dashboard > SQL Editor)
-- =====================================================


-- =====================================================
-- 1. SELLERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to Supabase Auth user
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Store branding
  store_name TEXT NOT NULL,
  store_description TEXT,
  
  -- Logo/branding (optional)
  logo_url TEXT,
  
  -- Contact information (for admin reference)
  contact_email TEXT,
  contact_phone TEXT,
  business_address TEXT,
  
  -- Status control (only admin can modify)
  is_active BOOLEAN DEFAULT false,  -- Starts inactive, admin must activate
  is_verified BOOLEAN DEFAULT false, -- For "Verified Seller" badge
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one seller profile per user
  CONSTRAINT unique_seller_user UNIQUE (user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_is_active ON sellers(is_active);
CREATE INDEX IF NOT EXISTS idx_sellers_store_name ON sellers(store_name);


-- =====================================================
-- 2. MODIFY PRODUCTS TABLE - ADD SELLER OWNERSHIP
-- =====================================================
-- NOTE: We use IF NOT EXISTS pattern to make this migration re-runnable

-- Add seller_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE products ADD COLUMN seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;
    CREATE INDEX idx_products_seller_id ON products(seller_id);
    RAISE NOTICE 'Added seller_id column to products table';
  ELSE
    RAISE NOTICE 'seller_id column already exists in products table';
  END IF;
END $$;


-- =====================================================
-- 3. ROW LEVEL SECURITY FOR SELLERS TABLE
-- =====================================================

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for re-running migration)
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile limited" ON sellers;

-- Policy 1: Admin has full access to sellers table
-- WHO: Users with is_admin = true in JWT metadata
-- WHAT: Full CRUD access
CREATE POLICY "Admin full access to sellers"
  ON sellers
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Policy 2: Sellers can view their own profile
-- WHO: Authenticated users who are sellers
-- WHAT: SELECT only their own row
CREATE POLICY "Sellers can view own profile"
  ON sellers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Sellers can update their own profile (limited fields)
-- WHO: Authenticated users who are sellers
-- WHAT: UPDATE only their own row, but NOT is_active or is_verified
-- NOTE: This policy allows update, but the trigger below prevents changing restricted fields
CREATE POLICY "Sellers can update own profile limited"
  ON sellers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 4. TRIGGER: PREVENT SELLERS FROM CHANGING OWN STATUS
-- =====================================================
-- This trigger ensures sellers cannot modify is_active or is_verified
-- Only admin can change these fields

CREATE OR REPLACE FUNCTION prevent_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is NOT an admin user
  IF NOT ((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean = true) THEN
    -- Prevent changes to is_active and is_verified by non-admins
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      RAISE EXCEPTION 'Only admin can change is_active status';
    END IF;
    IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      RAISE EXCEPTION 'Only admin can change is_verified status';
    END IF;
  END IF;
  
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_seller_status_protection ON sellers;
CREATE TRIGGER enforce_seller_status_protection
  BEFORE UPDATE ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_seller_status_change();


-- =====================================================
-- 5. UPDATE PRODUCTS RLS FOR SELLER ACCESS
-- =====================================================

-- Drop existing product policies to recreate with seller logic
DROP POLICY IF EXISTS "Public can view active products" ON products;
DROP POLICY IF EXISTS "Admins have full access" ON products;
DROP POLICY IF EXISTS "Sellers can view own products" ON products;
DROP POLICY IF EXISTS "Sellers can insert own products" ON products;
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON products;

-- Policy 1: Public can view active products (unchanged)
CREATE POLICY "Public can view active products"
  ON products
  FOR SELECT
  USING (is_active = true);

-- Policy 2: Admin has full access (unchanged logic)
CREATE POLICY "Admins have full access"
  ON products
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' 
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' 
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Policy 3: Sellers can view ALL their own products (including inactive)
CREATE POLICY "Sellers can view own products"
  ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = products.seller_id
      AND sellers.user_id = auth.uid()
      AND sellers.is_active = true
    )
  );

-- Policy 4: Sellers can INSERT products (assigned to their seller_id)
CREATE POLICY "Sellers can insert own products"
  ON products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = products.seller_id
      AND sellers.user_id = auth.uid()
      AND sellers.is_active = true
    )
  );

-- Policy 5: Sellers can UPDATE their own products
CREATE POLICY "Sellers can update own products"
  ON products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = products.seller_id
      AND sellers.user_id = auth.uid()
      AND sellers.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = products.seller_id
      AND sellers.user_id = auth.uid()
      AND sellers.is_active = true
    )
  );

-- Policy 6: Sellers can DELETE their own products
CREATE POLICY "Sellers can delete own products"
  ON products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sellers
      WHERE sellers.id = products.seller_id
      AND sellers.user_id = auth.uid()
      AND sellers.is_active = true
    )
  );


-- =====================================================
-- 6. SELLER ACCESS TO ORDER_ITEMS (VIEW ONLY)
-- =====================================================
-- Sellers need to see order_items that contain their products

DROP POLICY IF EXISTS "Sellers can view order items for their products" ON order_items;

CREATE POLICY "Sellers can view order items for their products"
  ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN sellers ON sellers.id = products.seller_id
      WHERE products.id = order_items.product_id
      AND sellers.user_id = auth.uid()
      AND sellers.is_active = true
    )
  );


-- =====================================================
-- 7. ADMIN POLICIES FOR ORDERS (FULL ACCESS)
-- =====================================================
-- Ensure admin can see all orders

DROP POLICY IF EXISTS "Admin full access to orders" ON orders;
DROP POLICY IF EXISTS "Admin full access to order_items" ON order_items;
DROP POLICY IF EXISTS "Admin full access to addresses" ON addresses;

CREATE POLICY "Admin full access to orders"
  ON orders
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Admin full access to order_items"
  ON order_items
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "Admin full access to addresses"
  ON addresses
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );


-- =====================================================
-- 8. HELPER FUNCTION: CHECK IF USER IS SELLER
-- =====================================================

CREATE OR REPLACE FUNCTION is_active_seller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sellers
    WHERE user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seller_id for current user
CREATE OR REPLACE FUNCTION get_my_seller_id()
RETURNS UUID AS $$
DECLARE
  seller_uuid UUID;
BEGIN
  SELECT id INTO seller_uuid
  FROM sellers
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN seller_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 9. UPDATE PRODUCTS VIEW WITH SELLER INFO
-- =====================================================
-- Create a view that includes seller info for the mobile app

DROP VIEW IF EXISTS products_with_seller;

CREATE VIEW products_with_seller AS
SELECT 
  p.*,
  s.store_name as seller_store_name,
  s.is_verified as seller_is_verified
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.id AND s.is_active = true;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked:

-- Check sellers table exists:
-- SELECT * FROM sellers LIMIT 5;

-- Check products has seller_id:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name = 'seller_id';

-- Check RLS policies:
-- SELECT policyname, tablename, cmd FROM pg_policies 
-- WHERE tablename IN ('sellers', 'products', 'order_items');


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- NEXT STEPS:
-- 1. Use admin dashboard to create seller accounts
-- 2. Assign products to sellers via seller_id
-- 3. Test seller login and product management
-- 4. Mobile app will display seller name from products_with_seller view
--
-- =====================================================
