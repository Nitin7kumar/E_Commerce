-- =====================================================
-- COMPLETE SELLER RLS FIX - Run this ENTIRE script
-- =====================================================

-- Step 1: Set admin flag on your user
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'nitinkumar250607@gmail.com';

-- Step 2: DROP ALL existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile limited" ON sellers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sellers;
DROP POLICY IF EXISTS "Enable read access for all users" ON sellers;
DROP POLICY IF EXISTS "Allow authenticated insert" ON sellers;
DROP POLICY IF EXISTS "Allow authenticated select" ON sellers;
DROP POLICY IF EXISTS "Allow authenticated update" ON sellers;
DROP POLICY IF EXISTS "Allow authenticated delete" ON sellers;

-- Step 3: Ensure RLS is enabled
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Step 4: Create admin policy
CREATE POLICY "Admin full access to sellers"
  ON sellers
  FOR ALL
  TO authenticated
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Step 5: Create seller view policy
CREATE POLICY "Sellers can view own profile"
  ON sellers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 6: Create seller update policy
CREATE POLICY "Sellers can update own profile"
  ON sellers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 7: Verify
SELECT 'Admin metadata updated and policies created!' as status;

-- Check policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sellers';

-- Check admin user
SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'nitinkumar250607@gmail.com';
