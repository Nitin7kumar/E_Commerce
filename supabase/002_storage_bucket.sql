-- =====================================================
-- STORAGE BUCKET SETUP FOR PRODUCT IMAGES
-- =====================================================
-- 
-- Run this in Supabase SQL Editor to create a storage bucket
-- for product images with proper access policies.
-- =====================================================

-- Note: Storage bucket creation is typically done via Supabase Dashboard
-- Go to: Storage > New Bucket > Name: "product-images" > Public: Yes

-- After creating the bucket, add these policies via SQL:

-- Step 1: Allow public read access to product images
-- WHY: Anyone should be able to view product images
INSERT INTO storage.policies (bucket_id, name, definition)
SELECT 
    'product-images',
    'Public Access',
    '{"operation": "SELECT", "role": "anon"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'product-images' AND name = 'Public Access'
);

-- =====================================================
-- MANUAL SETUP STEPS (Dashboard)
-- =====================================================
-- 
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New Bucket"
-- 3. Name: product-images
-- 4. Check "Public bucket" (for read access)
-- 5. Click "Create bucket"
-- 
-- 6. Click on the bucket > Policies tab
-- 7. Add policy for SELECT: Allow for all users (public)
-- 8. Add policy for INSERT/UPDATE/DELETE: Allow for authenticated admins only
--
-- For authenticated uploads, add this policy:
-- - Operation: INSERT
-- - Target roles: authenticated
-- - Policy: (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
-- =====================================================
