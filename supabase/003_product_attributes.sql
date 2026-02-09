-- =====================================================
-- PHASE 2: PRODUCT ATTRIBUTES EXTENSION
-- =====================================================
-- 
-- PURPOSE:
-- Extend the products table to support:
--   - Brand names
--   - Variable sizes (clothing S/M/L, shoes 6/7/8, quantities 100ml/200ml)
--   - Multiple colors per product
--
-- DESIGN DECISIONS:
-- 1. Using JSONB for sizes/colors instead of separate tables
--    - Simpler queries, no JOINs needed
--    - Flexible for different product types
--    - Easy to update UI without schema changes
--
-- 2. All new columns are NULLABLE for backward compatibility
--    - Existing products will continue to work
--    - UI will conditionally render based on data presence
--
-- 3. size_type is TEXT (not ENUM) for flexibility
--    - Allows adding new size types without migrations
--    - Values: 'clothing', 'shoe', 'quantity', 'none', or NULL
--
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR
-- =====================================================

-- Step 1: Add brand_name column
-- Purpose: Display brand name at top of product details
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- Step 2: Add size_type column
-- Purpose: Determines how sizes should be displayed
-- Values: 'clothing' (S/M/L), 'shoe' (6/7/8), 'quantity' (100ml), 'none' (no sizes)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS size_type TEXT DEFAULT 'none';

-- Step 3: Add sizes column (JSONB array)
-- Purpose: Store available sizes for the product
-- Examples:
--   Clothing: ["S", "M", "L", "XL"]
--   Shoes: ["6", "7", "8", "9", "10"]
--   Beauty: ["50ml", "100ml", "200ml"]
--   Any custom: ["Pack of 2", "Pack of 5"]
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;

-- Step 4: Add colors column (JSONB array of objects)
-- Purpose: Store available colors with hex codes for display
-- Format: [{"name": "Black", "hex": "#000000"}, {"name": "White", "hex": "#FFFFFF"}]
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb;

-- Step 5: Add default_color column
-- Purpose: Pre-select a color when product page loads
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS default_color TEXT;

-- =====================================================
-- VALIDATION CONSTRAINTS (Optional but Recommended)
-- =====================================================

-- Validate size_type values
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS valid_size_type;

ALTER TABLE products 
ADD CONSTRAINT valid_size_type 
CHECK (size_type IS NULL OR size_type IN ('clothing', 'shoe', 'quantity', 'none'));

-- Validate sizes is an array
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS sizes_is_array;

ALTER TABLE products 
ADD CONSTRAINT sizes_is_array 
CHECK (sizes IS NULL OR jsonb_typeof(sizes) = 'array');

-- Validate colors is an array
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS colors_is_array;

ALTER TABLE products 
ADD CONSTRAINT colors_is_array 
CHECK (colors IS NULL OR jsonb_typeof(colors) = 'array');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for brand filtering (if needed in future)
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_name);

-- GIN index for querying inside JSONB arrays (if needed for filtering)
CREATE INDEX IF NOT EXISTS idx_products_sizes ON products USING GIN(sizes);
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN(colors);

-- =====================================================
-- MIGRATION HELPER: Set defaults for existing products
-- =====================================================
-- This ensures existing products have proper defaults

UPDATE products 
SET 
    size_type = 'none',
    sizes = '[]'::jsonb,
    colors = '[]'::jsonb
WHERE size_type IS NULL;

-- =====================================================
-- VERIFICATION QUERIES (run these to test)
-- =====================================================

-- Check new columns exist:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'products'
-- ORDER BY ordinal_position;

-- Check constraints:
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%size%' OR constraint_name LIKE '%color%';

-- =====================================================
-- SAMPLE DATA (for testing - uncomment to use)
-- =====================================================

-- Clothing product with sizes and colors:
-- UPDATE products 
-- SET 
--     brand_name = 'Nike',
--     size_type = 'clothing',
--     sizes = '["S", "M", "L", "XL"]'::jsonb,
--     colors = '[{"name": "Black", "hex": "#000000"}, {"name": "White", "hex": "#FFFFFF"}, {"name": "Red", "hex": "#FF0000"}]'::jsonb,
--     default_color = 'Black'
-- WHERE id = 'your-product-id';

-- Shoe product:
-- UPDATE products 
-- SET 
--     brand_name = 'Adidas',
--     size_type = 'shoe',
--     sizes = '["6", "7", "8", "9", "10", "11"]'::jsonb,
--     colors = '[{"name": "Black", "hex": "#000000"}]'::jsonb
-- WHERE id = 'your-product-id';

-- Beauty product with quantities:
-- UPDATE products 
-- SET 
--     brand_name = 'Lakme',
--     size_type = 'quantity',
--     sizes = '["50ml", "100ml", "200ml"]'::jsonb,
--     colors = '[]'::jsonb
-- WHERE id = 'your-product-id';
