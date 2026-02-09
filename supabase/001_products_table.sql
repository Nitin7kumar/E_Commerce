-- =====================================================
-- PHASE 1: PRODUCTS TABLE - Clean Admin-Driven System
-- =====================================================
-- 
-- WHY THIS APPROACH:
-- We're building the simplest possible working product system.
-- No variants, no complex inventory - just products that:
--   1. Admins can manage via dashboard
--   2. Mobile app users can view (only active ones)
--
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR (Dashboard > SQL Editor)
-- =====================================================

-- Step 1: Enable UUID extension (if not already enabled)
-- WHY: We use UUIDs as primary keys for security and scalability
-- UUIDs prevent enumeration attacks and work well in distributed systems
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Drop existing products table if it exists (CAREFUL!)
-- WHY: We're starting fresh to avoid schema conflicts
-- IMPORTANT: Only do this in development. In production, use migrations.
DROP TABLE IF EXISTS products CASCADE;

-- Step 3: Create the products table
-- WHY each column:
--   id: Unique identifier, auto-generated UUID
--   name: Product name, required for display
--   description: Optional product details
--   price: Current selling price, required
--   category: Text category for filtering (keeping it simple)
--   image_url: Single image URL from Supabase Storage
--   stock: Integer for inventory tracking
--   is_active: Boolean to show/hide products without deleting
--   created_at: Automatic timestamp for sorting
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category TEXT,
    image_url TEXT,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create index for common queries
-- WHY: Speeds up filtering by is_active and category
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_category ON products(category);

-- Step 5: Enable Row Level Security
-- WHY: RLS ensures data access is controlled at the database level
-- Even if someone bypasses the app, they can't access unauthorized data
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
-- =====================================================

-- Policy 1: Public users can SELECT active products only
-- WHO: Anyone (including anonymous users with anon key)
-- WHAT: Can only read rows where is_active = true
-- WHY: Allows mobile app to fetch products without authentication
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
    ON products
    FOR SELECT
    USING (is_active = true);

-- Policy 2: Admins can do everything
-- WHO: Users with is_admin = true in their JWT metadata
-- WHAT: Full CRUD access (SELECT, INSERT, UPDATE, DELETE)
-- WHY: Admin dashboard needs full control over products
--
-- HOW ADMIN DETECTION WORKS:
-- Supabase stores user metadata in the JWT token
-- We check: auth.jwt() -> 'user_metadata' -> 'is_admin'
-- You set this when creating admin users in Supabase Auth
DROP POLICY IF EXISTS "Admins have full access" ON products;
CREATE POLICY "Admins have full access"
    ON products
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' 
        OR 
        (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role' 
        OR 
        (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
    );

-- =====================================================
-- VERIFICATION QUERIES (run these to test)
-- =====================================================

-- Check table structure:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'products';

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'products';

-- Check policies:
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'products';

-- =====================================================
-- TEST DATA (optional - for initial testing)
-- =====================================================
-- INSERT INTO products (name, description, price, category, stock, is_active) VALUES
-- ('Test T-Shirt', 'A comfortable cotton t-shirt', 499.00, 'Men', 100, true),
-- ('Test Dress', 'Elegant summer dress', 1299.00, 'Women', 50, true),
-- ('Test Sneakers', 'Running shoes', 2499.00, 'Footwear', 30, true);
