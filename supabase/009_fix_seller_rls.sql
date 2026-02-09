-- =====================================================
-- FIX: RLS Policy for Sellers Table
-- =====================================================
-- The current policy requires is_admin in JWT, but this might
-- not be set correctly. Let's create a more permissive policy
-- and also check the admin user.
-- =====================================================

-- First, let's check your admin user's metadata
-- Run this to see if is_admin is set:
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'nitinkumar250607@gmail.com';

-- If is_admin is not set, run this to fix it:
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
-- WHERE email = 'nitinkumar250607@gmail.com';

-- =====================================================
-- OPTION 1: Check and fix existing policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile limited" ON sellers;

-- Create a more permissive admin policy that logs what it checks
-- Admin policy: Full access for admins
CREATE POLICY "Admin full access to sellers"
  ON sellers
  FOR ALL
  USING (
    -- Check if user is admin via metadata
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
    OR
    -- Also check raw_user_meta_data for backwards compatibility
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
    OR
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Sellers can view their own profile
CREATE POLICY "Sellers can view own profile"
  ON sellers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Sellers can update their own profile (status fields protected by trigger)
CREATE POLICY "Sellers can update own profile"
  ON sellers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- OPTION 2: Temporarily disable RLS for testing
-- =====================================================
-- ONLY FOR TESTING! Remove this after confirming it works!

-- Uncomment this line to disable RLS temporarily:
-- ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with:
-- ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFY: Check the policies
-- =====================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'sellers';

SELECT 'Policies updated! Now try creating a seller again.' as status;
