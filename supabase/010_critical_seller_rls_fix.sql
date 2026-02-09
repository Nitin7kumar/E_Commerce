-- =====================================================
-- CRITICAL FIX: Seller Table RLS Policy
-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY
-- =====================================================

-- Step 1: Check your admin user's metadata
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email LIKE '%nitin%' OR email LIKE '%admin%';

-- Step 2: If is_admin is missing, ADD IT (change email as needed)
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'nitinkumar250607@gmail.com';

-- Step 3: Verify it was set
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'nitinkumar250607@gmail.com';

-- Step 4: Drop ALL existing policies on sellers
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile limited" ON sellers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sellers;
DROP POLICY IF EXISTS "Enable read access for all users" ON sellers;

-- Step 5: Make sure RLS is enabled
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Step 6: Create PERMISSIVE policy for admin INSERT/UPDATE/DELETE
-- This policy allows users with is_admin: true to do anything
CREATE POLICY "Admin full access to sellers"
  ON sellers
  FOR ALL
  TO authenticated
  USING (
    (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean = true
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Step 7: Allow sellers to read their own profile
CREATE POLICY "Sellers can view own profile"
  ON sellers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 8: Allow sellers to update their own profile (trigger protects status fields)
CREATE POLICY "Sellers can update own profile"
  ON sellers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 9: Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'sellers';

-- Step 10: Test insert (optional - replace with real user_id)
-- INSERT INTO sellers (user_id, store_name) VALUES ('YOUR-USER-ID', 'Test Store');

SELECT 'RLS POLICIES FIXED! Now log out of admin dashboard and log back in, then try creating a seller.' as status;
