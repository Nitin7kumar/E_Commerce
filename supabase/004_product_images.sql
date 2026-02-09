-- =====================================================
-- PHASE 3: MULTIPLE PRODUCT IMAGES SUPPORT
-- =====================================================
-- 
-- PURPOSE:
-- Enable products to have multiple images stored as a JSONB array.
-- This supports image carousels in the mobile app.
--
-- DESIGN DECISIONS:
-- 1. Using JSONB array for images instead of separate table
--    - Simpler queries, no JOINs needed
--    - Order is preserved (first image = primary)
--    - Easy to update from admin dashboard
--
-- 2. Backward compatibility with existing image_url column
--    - Keep image_url for legacy support
--    - App will prefer images[] if available, fallback to image_url
--
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR
-- =====================================================

-- Step 1: Add images column (JSONB array of URLs)
-- Format: ["https://...img1.jpg", "https://...img2.jpg", "https://...img3.jpg"]
-- First image in array is the primary/thumbnail image
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Step 2: Validate that images is an array
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS images_is_array;

ALTER TABLE products 
ADD CONSTRAINT images_is_array 
CHECK (images IS NULL OR jsonb_typeof(images) = 'array');

-- Step 3: Create GIN index for querying (if needed in future)
CREATE INDEX IF NOT EXISTS idx_products_images ON products USING GIN(images);

-- =====================================================
-- MIGRATION: Copy existing image_url to images array
-- =====================================================
-- This ensures existing products with image_url get migrated
-- Only runs for products that have image_url but empty images array

UPDATE products 
SET images = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL 
  AND image_url != ''
  AND (images IS NULL OR images = '[]'::jsonb);

-- =====================================================
-- VERIFICATION QUERIES (run these to test)
-- =====================================================

-- Check new column exists:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name = 'images';

-- Check migration worked:
-- SELECT id, name, image_url, images 
-- FROM products 
-- WHERE image_url IS NOT NULL
-- LIMIT 5;

-- =====================================================
-- SAMPLE DATA (for testing - uncomment to use)
-- =====================================================

-- Add multiple images to a product:
-- UPDATE products 
-- SET images = '[
--   "https://example.com/product1-front.jpg",
--   "https://example.com/product1-back.jpg",
--   "https://example.com/product1-side.jpg"
-- ]'::jsonb
-- WHERE id = 'your-product-id';
