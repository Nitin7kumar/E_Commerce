-- =====================================================
-- EMERGENCY FIX: Temporarily allow all authenticated users to insert
-- =====================================================
-- USE THIS ONLY IF THE ABOVE DOESN'T WORK
-- RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================

-- Drop all policies
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON sellers;
DROP POLICY IF EXISTS "Sellers can update own profile" ON sellers;

-- Create permissive policy that allows any authenticated user to insert
-- (You should restrict this later, but this tests if the issue is RLS)
CREATE POLICY "Allow authenticated insert"
  ON sellers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated select"
  ON sellers
  FOR SELECT
  TO authenticated  
  USING (true);

CREATE POLICY "Allow authenticated update"
  ON sellers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete"
  ON sellers
  FOR DELETE
  TO authenticated
  USING (true);

SELECT 'EMERGENCY POLICIES CREATED - Try creating seller now!' as status;
