-- =====================================================
-- FIX: Admin can see ALL profiles
-- =====================================================
-- The admin can only see their own profile due to RLS
-- We need to add a policy for admins to see all profiles
-- =====================================================

-- Check current policies on profiles
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Drop any restrictive policies
DROP POLICY IF EXISTS "Users can only view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin full access to profiles" ON profiles;

-- Create comprehensive policies

-- 1. Admin can see ALL profiles
CREATE POLICY "Admin can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- 2. Admin can update ALL profiles
CREATE POLICY "Admin can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- 3. Users can see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Allow insert for authenticated users (for profile creation)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Verify policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Count profiles to verify
SELECT COUNT(*) as total_profiles FROM profiles;

SELECT 'Admin can now see all profiles! Refresh the dashboard.' as status;
