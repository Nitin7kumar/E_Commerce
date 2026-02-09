-- =====================================================
-- ADD MRP AND DISCOUNT COLUMNS TO PRODUCTS TABLE
-- =====================================================
-- This adds support for:
-- - mrp: Maximum Retail Price (original price)
-- - discount_percent: Discount percentage (0-100)
-- - The 'price' column becomes the selling price (auto-calculated or manually set)
-- 
-- Display format: MRP ₹1999 ₹1299 (35% OFF)
-- =====================================================

-- Add MRP column (Maximum Retail Price / Original Price)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2) DEFAULT NULL;

-- Add Discount Percentage column (0-100)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- Update existing products: Set MRP equal to current price (no discount)
UPDATE products 
SET mrp = price, discount_percent = 0 
WHERE mrp IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('mrp', 'discount_percent', 'price')
ORDER BY ordinal_position;

-- =====================================================
-- REFRESH VIEW TO INCLUDE NEW COLUMNS
-- =====================================================
-- Recreate products_with_seller view to ensure new columns are included

DROP VIEW IF EXISTS products_with_seller;

CREATE VIEW products_with_seller 
WITH (security_invoker = true) AS
SELECT 
  p.*,
  s.store_name as seller_store_name,
  s.is_verified as seller_is_verified
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.id AND s.is_active = true;

-- Grant access to authenticated and anon users
GRANT SELECT ON products_with_seller TO authenticated;
GRANT SELECT ON products_with_seller TO anon;

SELECT 'MRP and Discount columns added successfully! Mobile app will now show discount prices.' as status;
