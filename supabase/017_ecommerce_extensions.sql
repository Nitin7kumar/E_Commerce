-- =====================================================
-- PHASE 17: E-COMMERCE EXTENSIONS
-- Pre-Purchase, Social Proof, Catalog, Marketing & Operations
-- =====================================================
--
-- This migration adds critical "middle-layer" functionality:
--   1. Pre-Purchase Module (Cart & Wishlist)
--   2. Social Proof Module (Reviews)
--   3. Catalog Management (Hierarchical Categories)
--   4. Marketing Module (Coupons/Promotions)
--   5. Operations Module (Payments & Returns)
--
-- DESIGN PRINCIPLES:
--   - All PKs use UUID (gen_random_uuid())
--   - All tables include created_at/updated_at (timestamptz)
--   - Proper FK constraints with appropriate ON DELETE behavior
--   - RLS policies following existing security patterns
--
-- RUN THIS SQL IN YOUR SUPABASE SQL EDITOR (Dashboard > SQL Editor)
-- =====================================================


-- =====================================================
-- PART 1: PRE-PURCHASE MODULE (Cart & Wishlist)
-- =====================================================

-- -----------------------------------------------------
-- 1.1 WISHLISTS TABLE
-- -----------------------------------------------------
-- Users can save products for later purchase
-- Unique constraint prevents duplicate entries

CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate wishlist entries
  CONSTRAINT unique_wishlist_item UNIQUE (user_id, product_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);


-- -----------------------------------------------------
-- 1.2 CARTS TABLE
-- -----------------------------------------------------
-- Each user has ONE active cart at a time
-- Cart persists across sessions until checkout

CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- One cart per user
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cart status (active, checked_out, abandoned)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'abandoned')),
  
  -- Guest cart token (for anonymous carts before login)
  guest_token TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active cart per user
  CONSTRAINT unique_active_cart_per_user UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);
CREATE INDEX IF NOT EXISTS idx_carts_guest_token ON carts(guest_token);


-- -----------------------------------------------------
-- 1.3 CART ITEMS TABLE
-- -----------------------------------------------------
-- Individual items within a cart with variants

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Quantity and variants
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 100),
  selected_size TEXT,
  selected_color TEXT,
  
  -- Price snapshot at time of add (for price change detection)
  price_at_add NUMERIC(12, 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate product+variant combinations in same cart
  CONSTRAINT unique_cart_item_variant UNIQUE (cart_id, product_id, selected_size, selected_color)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);


-- =====================================================
-- PART 2: SOCIAL PROOF MODULE (Reviews)
-- =====================================================

-- -----------------------------------------------------
-- 2.1 REVIEWS TABLE
-- -----------------------------------------------------
-- Product reviews with ratings, comments, and images
-- Optional order_id for "Verified Purchase" logic

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Optional: for verified purchase
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  
  -- Review images (array of URLs)
  images TEXT[],
  
  -- Moderation
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true, -- Admin moderation flag
  is_featured BOOLEAN DEFAULT false, -- Highlight reviews
  
  -- Helpful votes
  helpful_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One review per user per product (users can edit their review)
  CONSTRAINT unique_user_product_review UNIQUE (user_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);


-- -----------------------------------------------------
-- 2.2 REVIEW HELPFUL VOTES TABLE
-- -----------------------------------------------------
-- Track which users found which reviews helpful

CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  vote_type TEXT DEFAULT 'helpful' CHECK (vote_type IN ('helpful', 'not_helpful')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_review_vote UNIQUE (user_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);


-- =====================================================
-- PART 3: CATALOG MANAGEMENT (Hierarchical Categories)
-- =====================================================

-- -----------------------------------------------------
-- 3.1 CATEGORIES TABLE
-- -----------------------------------------------------
-- Hierarchical category tree using self-referencing parent_id
-- Supports unlimited nesting levels

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Self-referencing for hierarchy
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Category info
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier
  description TEXT,
  image_url TEXT,
  
  -- Tree metadata
  level INTEGER DEFAULT 0, -- Depth in tree (0 = root)
  display_order INTEGER DEFAULT 0, -- Sort order within parent
  
  -- Full path for breadcrumbs (auto-computed via trigger)
  path TEXT, -- e.g., "Electronics > Smartphones > Android"
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);


-- -----------------------------------------------------
-- 3.2 ADD CATEGORY_ID TO PRODUCTS TABLE
-- -----------------------------------------------------
-- Link products to the new category system

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    CREATE INDEX idx_products_category_id ON products(category_id);
    RAISE NOTICE 'Added category_id column to products table';
  ELSE
    RAISE NOTICE 'category_id column already exists in products table';
  END IF;
END $$;


-- -----------------------------------------------------
-- 3.3 CATEGORY PATH TRIGGER
-- -----------------------------------------------------
-- Automatically compute the full category path

CREATE OR REPLACE FUNCTION compute_category_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
  parent_level INTEGER;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level := 0;
    NEW.path := NEW.name;
  ELSE
    SELECT path, level INTO parent_path, parent_level
    FROM categories
    WHERE id = NEW.parent_id;
    
    NEW.level := COALESCE(parent_level, 0) + 1;
    NEW.path := COALESCE(parent_path, '') || ' > ' || NEW.name;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compute_category_path ON categories;
CREATE TRIGGER trigger_compute_category_path
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION compute_category_path();


-- =====================================================
-- PART 4: MARKETING MODULE (Coupons/Promotions)
-- =====================================================

-- -----------------------------------------------------
-- 4.1 COUPONS TABLE
-- -----------------------------------------------------
-- Discount codes with various configurations

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Coupon code (case-insensitive)
  code TEXT NOT NULL UNIQUE,
  
  -- Description
  name TEXT NOT NULL,
  description TEXT,
  
  -- Discount configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount NUMERIC(12, 2), -- Cap for percentage discounts
  
  -- Usage conditions
  min_order_value NUMERIC(12, 2) DEFAULT 0,
  max_uses INTEGER, -- Total usage limit (NULL = unlimited)
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Targeting (optional)
  applicable_categories UUID[], -- Specific categories only
  applicable_products UUID[], -- Specific products only
  first_order_only BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_dates ON coupons(valid_from, valid_until);


-- -----------------------------------------------------
-- 4.2 COUPON USAGES TABLE
-- -----------------------------------------------------
-- Track coupon usage per user per order for abuse prevention

CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Discount applied
  discount_amount NUMERIC(12, 2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id ON coupon_usages(order_id);


-- -----------------------------------------------------
-- 4.3 COUPON VALIDATION FUNCTION
-- -----------------------------------------------------
-- Validate if a coupon can be used by a user

CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_order_value NUMERIC
)
RETURNS TABLE (
  is_valid BOOLEAN,
  coupon_id UUID,
  discount_amount NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
  v_discount NUMERIC;
BEGIN
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code)
  AND is_active = true
  LIMIT 1;
  
  -- Coupon not found
  IF v_coupon IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Invalid coupon code'::TEXT;
    RETURN;
  END IF;
  
  -- Check validity period
  IF NOW() < v_coupon.valid_from THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Coupon is not yet active'::TEXT;
    RETURN;
  END IF;
  
  IF v_coupon.valid_until IS NOT NULL AND NOW() > v_coupon.valid_until THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Coupon has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum order value
  IF p_order_value < v_coupon.min_order_value THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 
      ('Minimum order value is ₹' || v_coupon.min_order_value)::TEXT;
    RETURN;
  END IF;
  
  -- Check total usage limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Coupon usage limit reached'::TEXT;
    RETURN;
  END IF;
  
  -- Check user's usage limit
  SELECT COUNT(*) INTO v_user_uses
  FROM coupon_usages
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
  
  IF v_user_uses >= v_coupon.max_uses_per_user THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'You have already used this coupon'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate discount
  IF v_coupon.discount_type = 'percent' THEN
    v_discount := p_order_value * (v_coupon.discount_value / 100);
    IF v_coupon.max_discount_amount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
    END IF;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;
  
  -- Discount cannot exceed order value
  v_discount := LEAST(v_discount, p_order_value);
  
  RETURN QUERY SELECT true, v_coupon.id, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- PART 5: OPERATIONS MODULE (Payments & Returns)
-- =====================================================

-- -----------------------------------------------------
-- 5.1 PAYMENTS TABLE
-- -----------------------------------------------------
-- Generic payment records linked to orders

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payment gateway info
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'razorpay', 'paypal', 'cod', 'upi', 'wallet', 'other')),
  transaction_id TEXT, -- Gateway transaction ID
  provider_order_id TEXT, -- Gateway's order ID
  
  -- Payment details
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'INR',
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Payment initiated
    'processing',   -- Being processed
    'completed',    -- Successfully paid
    'failed',       -- Payment failed
    'cancelled',    -- Cancelled by user
    'refunded',     -- Full refund
    'partially_refunded' -- Partial refund
  )),
  
  -- Failure info
  failure_reason TEXT,
  failure_code TEXT,
  
  -- Refund tracking
  refund_amount NUMERIC(12, 2) DEFAULT 0,
  refund_id TEXT,
  refunded_at TIMESTAMPTZ,
  
  -- Raw response from payment gateway (for debugging)
  gateway_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);


-- -----------------------------------------------------
-- 5.2 RETURNS TABLE
-- -----------------------------------------------------
-- Return/refund requests linked to orders

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL, -- Optional: for partial returns
  
  -- Return request number (for customer reference)
  return_number TEXT NOT NULL UNIQUE,
  
  -- Return type
  return_type TEXT DEFAULT 'refund' CHECK (return_type IN ('refund', 'replacement', 'exchange')),
  
  -- Reason and evidence
  reason TEXT NOT NULL,
  reason_category TEXT CHECK (reason_category IN (
    'damaged',
    'defective',
    'wrong_item',
    'size_issue',
    'quality_issue',
    'not_as_described',
    'change_of_mind',
    'other'
  )),
  detailed_description TEXT,
  evidence_images TEXT[], -- Array of image URLs
  
  -- Items being returned (for partial returns)
  items_returned JSONB, -- [{product_id, quantity, reason}]
  
  -- Financial
  refund_amount NUMERIC(12, 2),
  
  -- Status tracking
  status TEXT DEFAULT 'requested' CHECK (status IN (
    'requested',      -- User submitted request
    'under_review',   -- Admin reviewing
    'approved',       -- Return approved
    'rejected',       -- Return rejected
    'pickup_scheduled', -- Pickup arranged
    'picked_up',      -- Items picked up
    'received',       -- Items received at warehouse
    'inspecting',     -- Quality inspection
    'refund_initiated', -- Refund started
    'refund_completed', -- Refund done
    'replacement_shipped', -- Replacement sent
    'closed'          -- Completed
  )),
  
  -- Admin notes
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Pickup details
  pickup_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  pickup_date DATE,
  pickup_slot TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);


-- -----------------------------------------------------
-- 5.3 RETURN NUMBER GENERATOR
-- -----------------------------------------------------
-- Auto-generate return numbers like RET-20260208-0001

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  today_date TEXT;
  sequence_num INTEGER;
  new_return_number TEXT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(return_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM returns
  WHERE return_number LIKE 'RET-' || today_date || '-%';
  
  new_return_number := 'RET-' || today_date || '-' || LPAD(sequence_num::TEXT, 4, '0');
  NEW.return_number := new_return_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_return_number ON returns;
CREATE TRIGGER trigger_generate_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL)
  EXECUTE FUNCTION generate_return_number();


-- =====================================================
-- PART 6: ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------
-- 6.1 WISHLISTS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlists;
DROP POLICY IF EXISTS "Users can add to own wishlist" ON wishlists;
DROP POLICY IF EXISTS "Users can remove from own wishlist" ON wishlists;
DROP POLICY IF EXISTS "Admin full access to wishlists" ON wishlists;

CREATE POLICY "Users can view own wishlist"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own wishlist"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own wishlist"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to wishlists"
  ON wishlists FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.2 CARTS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own cart" ON carts;
DROP POLICY IF EXISTS "Users can create own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Admin full access to carts" ON carts;

CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to carts"
  ON carts FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.3 CART ITEMS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can remove from own cart" ON cart_items;
DROP POLICY IF EXISTS "Admin full access to cart_items" ON cart_items;

CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to own cart"
  ON cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from own cart"
  ON cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin full access to cart_items"
  ON cart_items FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.4 REVIEWS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
DROP POLICY IF EXISTS "Admin full access to reviews" ON reviews;

-- Public can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

-- Users can also see their own unapproved reviews
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to reviews"
  ON reviews FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.5 REVIEW VOTES RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view review votes" ON review_votes;
DROP POLICY IF EXISTS "Users can vote on reviews" ON review_votes;
DROP POLICY IF EXISTS "Users can change own votes" ON review_votes;
DROP POLICY IF EXISTS "Users can remove own votes" ON review_votes;

CREATE POLICY "Users can view review votes"
  ON review_votes FOR SELECT
  USING (true); -- Public read to show vote counts

CREATE POLICY "Users can vote on reviews"
  ON review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change own votes"
  ON review_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own votes"
  ON review_votes FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------
-- 6.6 CATEGORIES RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
DROP POLICY IF EXISTS "Admin full access to categories" ON categories;

-- Public can view active categories
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin full access to categories"
  ON categories FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.7 COUPONS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
DROP POLICY IF EXISTS "Admin full access to coupons" ON coupons;

-- Users can view active coupons (to display available offers)
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin full access to coupons"
  ON coupons FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.8 COUPON USAGES RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own coupon usage" ON coupon_usages;
DROP POLICY IF EXISTS "System can create coupon usage" ON coupon_usages;
DROP POLICY IF EXISTS "Admin full access to coupon_usages" ON coupon_usages;

CREATE POLICY "Users can view own coupon usage"
  ON coupon_usages FOR SELECT
  USING (auth.uid() = user_id);

-- Allow insert via service role or admin (for order processing)
CREATE POLICY "Admin full access to coupon_usages"
  ON coupon_usages FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Users can create usage records for their own coupons (during checkout)
CREATE POLICY "Users can record own coupon usage"
  ON coupon_usages FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------
-- 6.9 PAYMENTS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
DROP POLICY IF EXISTS "Admin full access to payments" ON payments;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access to payments"
  ON payments FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );


-- -----------------------------------------------------
-- 6.10 RETURNS RLS
-- -----------------------------------------------------

DROP POLICY IF EXISTS "Users can view own returns" ON returns;
DROP POLICY IF EXISTS "Users can create returns" ON returns;
DROP POLICY IF EXISTS "Users can update pending returns" ON returns;
DROP POLICY IF EXISTS "Admin full access to returns" ON returns;
DROP POLICY IF EXISTS "Sellers can view returns for their products" ON returns;

CREATE POLICY "Users can view own returns"
  ON returns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create returns"
  ON returns FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = returns.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Users can update their returns only if still in 'requested' status
CREATE POLICY "Users can update pending returns"
  ON returns FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'requested'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'requested'
  );

CREATE POLICY "Admin full access to returns"
  ON returns FOR ALL
  USING (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  )
  WITH CHECK (
    COALESCE((current_setting('request.jwt.claims', true)::json -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
  );

-- Sellers can view returns for orders containing their products
CREATE POLICY "Sellers can view returns for their products"
  ON returns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN sellers s ON s.id = p.seller_id
      WHERE oi.order_id = returns.order_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
    )
  );


-- =====================================================
-- PART 7: HELPER FUNCTIONS & VIEWS
-- =====================================================

-- -----------------------------------------------------
-- 7.1 PRODUCT RATING SUMMARY VIEW
-- -----------------------------------------------------
-- Aggregate ratings for product display

DROP VIEW IF EXISTS product_ratings;

CREATE VIEW product_ratings AS
SELECT
  product_id,
  COUNT(*) as review_count,
  ROUND(AVG(rating)::numeric, 1) as average_rating,
  COUNT(*) FILTER (WHERE rating = 5) as five_star,
  COUNT(*) FILTER (WHERE rating = 4) as four_star,
  COUNT(*) FILTER (WHERE rating = 3) as three_star,
  COUNT(*) FILTER (WHERE rating = 2) as two_star,
  COUNT(*) FILTER (WHERE rating = 1) as one_star,
  COUNT(*) FILTER (WHERE is_verified_purchase) as verified_count
FROM reviews
WHERE is_approved = true
GROUP BY product_id;

GRANT SELECT ON product_ratings TO authenticated;
GRANT SELECT ON product_ratings TO anon;


-- -----------------------------------------------------
-- 7.2 CART TOTAL FUNCTION
-- -----------------------------------------------------
-- Calculate cart total with product prices

CREATE OR REPLACE FUNCTION get_cart_total(p_user_id UUID)
RETURNS TABLE (
  item_count INTEGER,
  subtotal NUMERIC,
  savings NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ci.quantity)::INTEGER, 0) as item_count,
    COALESCE(SUM(p.price * ci.quantity), 0)::NUMERIC as subtotal,
    COALESCE(SUM((COALESCE(p.mrp, p.price) - p.price) * ci.quantity), 0)::NUMERIC as savings
  FROM carts c
  JOIN cart_items ci ON ci.cart_id = c.id
  JOIN products p ON p.id = ci.product_id
  WHERE c.user_id = p_user_id
  AND c.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------
-- 7.3 UPDATED_AT TRIGGERS FOR NEW TABLES
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- PART 8: SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample categories
/*
INSERT INTO categories (name, slug, description, level, display_order) VALUES
('Men', 'men', 'Men''s Fashion', 0, 1),
('Women', 'women', 'Women''s Fashion', 0, 2),
('Kids', 'kids', 'Kids'' Fashion', 0, 3),
('Electronics', 'electronics', 'Gadgets & Electronics', 0, 4),
('Home', 'home', 'Home & Living', 0, 5);

-- Add subcategories
WITH parent AS (SELECT id FROM categories WHERE slug = 'men')
INSERT INTO categories (name, slug, description, parent_id, display_order)
SELECT 'Topwear', 'men-topwear', 'T-Shirts, Shirts & more', id, 1 FROM parent
UNION ALL
SELECT 'Bottomwear', 'men-bottomwear', 'Jeans, Trousers & more', id, 2 FROM parent
UNION ALL
SELECT 'Footwear', 'men-footwear', 'Sneakers, Sandals & more', id, 3 FROM parent;
*/

-- Uncomment to insert sample coupon
/*
INSERT INTO coupons (code, name, description, discount_type, discount_value, min_order_value, max_uses_per_user, valid_until)
VALUES
('WELCOME20', 'Welcome Discount', '20% off on your first order', 'percent', 20, 500, 1, NOW() + INTERVAL '30 days'),
('FLAT100', 'Flat ₹100 Off', 'Flat ₹100 discount', 'fixed', 100, 999, 3, NOW() + INTERVAL '60 days');
*/


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked:

-- Check all new tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('wishlists', 'carts', 'cart_items', 'reviews', 'review_votes', 
                   'categories', 'coupons', 'coupon_usages', 'payments', 'returns');

-- Check RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('wishlists', 'carts', 'cart_items', 'reviews', 'categories', 
                  'coupons', 'coupon_usages', 'payments', 'returns');

-- Check category_id was added to products:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'category_id';


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
--
-- SUMMARY OF NEW TABLES:
--   1. wishlists - User product wishlists
--   2. carts - User shopping carts
--   3. cart_items - Items in carts with variants
--   4. reviews - Product reviews with ratings
--   5. review_votes - Helpful vote tracking
--   6. categories - Hierarchical category tree
--   7. coupons - Discount codes
--   8. coupon_usages - Coupon usage tracking
--   9. payments - Payment records
--   10. returns - Return/refund requests
--
-- NEW FUNCTIONS:
--   - validate_coupon(code, user_id, order_value)
--   - get_cart_total(user_id)
--   - compute_category_path() [trigger]
--   - generate_return_number() [trigger]
--
-- NEW VIEWS:
--   - product_ratings (aggregated review stats)
--
-- NEXT STEPS:
--   1. Create initial categories (Men, Women, Kids, etc.)
--   2. Update existing products with category_id
--   3. Test cart and wishlist functionality
--   4. Create promotional coupons
--   5. Integrate with payment gateway webhooks
--
-- =====================================================

SELECT 'E-commerce extensions migration completed successfully!' as status;
