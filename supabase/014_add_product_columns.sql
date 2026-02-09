-- =====================================================
-- ADD MISSING COLUMNS TO PRODUCTS TABLE
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add 'images' column for multiple product images
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT NULL;

-- Add 'highlights' column for product highlights
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT NULL;

-- Add 'attributes' column for product attributes (key-value pairs)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

SELECT 'Columns added successfully! Try creating a product now.' as status;
