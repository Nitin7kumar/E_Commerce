-- =====================================================
-- SELLER SYSTEM - QUICK SETUP
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
-- This creates the sellers table and basic policies
-- =====================================================

-- 1. Create Sellers Table
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_address TEXT,
  is_active BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_seller_user UNIQUE (user_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_is_active ON sellers(is_active);

-- 3. Add seller_id to products table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE products ADD COLUMN seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;
    CREATE INDEX idx_products_seller_id ON products(seller_id);
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if exist
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile limited" ON sellers;

-- 6. Admin has full access to sellers table
CREATE POLICY "Admin full access to sellers"
  ON sellers
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- 7. Sellers can view their own profile
CREATE POLICY "Sellers can view own profile"
  ON sellers
  FOR SELECT
  USING (auth.uid() = user_id);

-- 8. Sellers can update their own profile (limited fields via trigger)
CREATE POLICY "Sellers can update own profile limited"
  ON sellers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Trigger to prevent sellers from changing their own status
CREATE OR REPLACE FUNCTION prevent_seller_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if current user is admin
  IF NOT ((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean = true) THEN
    -- Non-admin trying to change is_active
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      RAISE EXCEPTION 'Only admin can change is_active status';
    END IF;
    -- Non-admin trying to change is_verified
    IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      RAISE EXCEPTION 'Only admin can change is_verified status';
    END IF;
  END IF;
  
  -- Always update the timestamp
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sellers_status_protection ON sellers;
CREATE TRIGGER sellers_status_protection
  BEFORE UPDATE ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_seller_status_change();

-- 10. Create products_with_seller view
CREATE OR REPLACE VIEW products_with_seller AS
SELECT 
  p.*,
  s.store_name as seller_store_name,
  s.is_verified as seller_is_verified
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.id AND s.is_active = true;

-- =====================================================
-- DONE! Now you can:
-- 1. Go to Admin Dashboard > Sellers
-- 2. Click "Add Seller" with a NEW email address
-- 3. The seller will be created and visible in this table
-- =====================================================

SELECT 'Seller system created successfully!' as status;
