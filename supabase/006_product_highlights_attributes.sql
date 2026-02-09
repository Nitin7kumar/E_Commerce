-- =====================================================
-- MIGRATION 006: Product Highlights & Attributes
-- =====================================================
--
-- PURPOSE:
-- Extend the products table with STRUCTURED product information
-- to provide richer Product Details experience in the mobile app.
--
-- NEW FIELDS:
-- 1. highlights (JSONB) - Array of bullet points
--    Example: ["100% Cotton fabric", "Machine washable", "Regular fit"]
--
-- 2. attributes (JSONB) - Key-value pairs for product specifications
--    Example: {"Material": "Cotton", "Fit": "Regular", "Sleeve": "Half Sleeve"}
--
-- DESIGN DECISIONS:
-- - Both fields are NULLABLE to maintain backward compatibility
-- - Existing products continue to work without any data migration
-- - JSONB type allows flexible schema without hardcoding attribute names
-- - No fixed validation - admin can add any highlights/attributes
--
-- =====================================================

-- Step 1: Add 'highlights' column (nullable JSONB array)
-- Stores: ["highlight 1", "highlight 2", "highlight 3"]
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT NULL;

-- Step 2: Add 'attributes' column (nullable JSONB object)
-- Stores: {"Key1": "Value1", "Key2": "Value2"}
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT NULL;

-- Step 3: Add 'seller_name' column for displaying seller info on product page
-- This is cached for display purposes (denormalized for performance)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS seller_name TEXT DEFAULT NULL;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN products.highlights IS 'JSON array of product highlight strings for bullet-point display';
COMMENT ON COLUMN products.attributes IS 'JSON object of key-value product attributes for table-style display';
COMMENT ON COLUMN products.seller_name IS 'Cached seller name for display on product details (denormalized)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify columns were added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' 
-- AND column_name IN ('highlights', 'attributes', 'seller_name');

-- Test inserting product with highlights and attributes:
-- UPDATE products 
-- SET 
--   highlights = '["100% Cotton fabric", "Regular fit", "Machine washable"]'::jsonb,
--   attributes = '{"Material": "Cotton", "Fit": "Regular", "Sleeve": "Half Sleeve", "Occasion": "Casual"}'::jsonb,
--   seller_name = 'Fashion Store'
-- WHERE id = 'your-product-id';

-- =====================================================
-- EXAMPLE DATA FORMAT
-- =====================================================
--
-- highlights (JSONB array):
-- [
--   "100% Cotton fabric",
--   "Regular fit for comfortable wear", 
--   "Machine washable",
--   "Breathable material"
-- ]
--
-- attributes (JSONB object):
-- {
--   "Material": "100% Cotton",
--   "Fit": "Regular",
--   "Sleeve": "Half Sleeve",
--   "Neck": "Round Neck",
--   "Occasion": "Casual",
--   "Pattern": "Solid",
--   "Wash Care": "Machine wash cold"
-- }
--
-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 
-- 1. NO BREAKING CHANGES: Existing products work without modification
-- 2. NO DATA MIGRATION REQUIRED: Old products simply have NULL values
-- 3. MOBILE APP BEHAVIOR: 
--    - If highlights is NULL/empty → Section is hidden
--    - If attributes is NULL/empty → Section is hidden
--    - Description is ALWAYS shown (even if empty string)
-- 4. ADMIN DASHBOARD: 
--    - Dynamic highlight inputs (add/remove bullets)
--    - Dynamic attribute inputs (add/remove key-value pairs)
--
-- =====================================================
