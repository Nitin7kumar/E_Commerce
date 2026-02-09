# Phase 1: Admin-Driven Product System

## 📋 Overview

This document explains the clean implementation of the product system and why the previous implementation failed.

---

## 🚨 Why Previous Order/Product Logic Failed

### Root Causes:

1. **Schema Mismatch**
   - Previous code queried `products_with_inventory` (a view that didn't exist)
   - Expected columns like `base_price`, `discount_percent`, `brand`, `category_id`, `variants`
   - The actual table structure was different or non-existent

2. **Missing Row Level Security (RLS)**
   - Without proper RLS policies, anonymous users couldn't read data
   - Authenticated users couldn't write data
   - Supabase silently returns empty results when RLS blocks access

3. **No Admin Authentication**
   - Admin dashboard had no login/protection
   - Anyone could access admin routes
   - But database operations failed due to missing permissions

4. **Complex Schema Before Basics**
   - Tried to implement variants, inventory, orders, payments all at once
   - Too many moving parts = impossible to debug
   - No clear data flow

5. **Mock Data Dependency**
   - React Native app was importing mock data directly
   - Even with working database, app showed hardcoded products

---

## ✅ New Implementation (Phase 1)

### Architecture:

```
┌─────────────────────┐
│   Admin Dashboard   │
│   (React + Vite)    │
│                     │
│  • Auth Login       │
│  • Route Protection │
│  • Product CRUD     │
│  • Image Upload     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│     Supabase        │
│                     │
│  • Auth (Admin)     │
│  • products table   │
│  • Storage bucket   │
│  • RLS Policies     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  React Native App   │
│                     │
│  • useProducts()    │
│  • Loading state    │
│  • Error state      │
│  • Empty state      │
└─────────────────────┘
```

### Key Files:

| File | Purpose |
|------|---------|
| `supabase/001_products_table.sql` | Products table + RLS policies |
| `supabase/002_storage_bucket.sql` | Image storage setup |
| `admin-dashboard/src/lib/supabase.ts` | Admin Supabase client + services |
| `admin-dashboard/src/pages/Login.tsx` | Admin authentication |
| `admin-dashboard/src/components/ProtectedRoute.tsx` | Route protection |
| `admin-dashboard/src/pages/Products.tsx` | Product management UI |
| `src/services/productService.ts` | Clean product fetching |
| `src/screens/home/HomeScreen.tsx` | Uses `useProducts()` hook |

---

## 🗄️ Database Setup

### Step 1: Create Products Table

Run this SQL in Supabase Dashboard > SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table (development only!)
DROP TABLE IF EXISTS products CASCADE;

-- Create simple products table
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

-- Create indexes
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_category ON products(category);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active products
CREATE POLICY "Public can view active products"
    ON products FOR SELECT
    USING (is_active = true);

-- Policy: Admins have full access
CREATE POLICY "Admins have full access"
    ON products FOR ALL
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
```

### Step 2: Create Admin User

In Supabase Dashboard > Authentication > Users:

1. Click "Add User"
2. Enter email and password
3. After creation, click on the user
4. Edit "User Metadata" and add:
   ```json
   {
     "is_admin": true
   }
   ```
5. Save changes

### Step 3: Create Storage Bucket

In Supabase Dashboard > Storage:

1. Click "New Bucket"
2. Name: `product-images`
3. Check "Public bucket"
4. Click "Create bucket"
5. Go to Policies tab
6. Add policy for SELECT: Allow all (public read)
7. Add policy for INSERT/UPDATE/DELETE: Allow authenticated users where `(auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true`

---

## 🧑‍💼 Admin Dashboard Usage

### Login

1. Navigate to `http://localhost:5173/login`
2. Enter admin credentials
3. If not admin, you'll see "Access Denied"

### Managing Products

1. Go to Products page
2. Click "Add Product"
3. Fill in details:
   - Name (required)
   - Description
   - Category (Men, Women, Kids, Footwear, Accessories, Beauty)
   - Price (required)
   - Stock quantity
   - Active status
4. Upload image (optional)
5. Save

### Toggling Product Visibility

- Click the "Active/Inactive" badge to toggle
- Inactive products won't show in the mobile app

---

## 📱 React Native App

### How Products are Fetched

```typescript
// src/services/productService.ts
const { data, error } = await getSupabase()
  .from('products')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

### Using in Components

```typescript
// In any component
import { useProducts } from '../../services/productService';

const { products, loading, error, refetch } = useProducts();
```

### States Handled

1. **Loading**: Shows spinner
2. **Error**: Shows error message with retry button
3. **Empty**: Shows "No products available"
4. **Success**: Shows product cards

---

## 🔍 Debugging

### Check if Supabase is configured:

```typescript
import { isSupabaseConfigured } from '../config/supabase';
console.log('Supabase configured:', isSupabaseConfigured());
```

### Verify RLS policies:

```sql
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### Test public read access:

```sql
-- As anonymous user, should return only active products
SELECT * FROM products WHERE is_active = true;
```

### Check admin metadata:

```sql
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'your-admin@email.com';
```

---

## ⏭️ Next Steps (Phase 2+)

After this Phase 1 is working:

1. ✅ **Phase 2**: Seller System - [See docs/PHASE2_SELLER_SYSTEM.md](./docs/PHASE2_SELLER_SYSTEM.md)
   - Sellers table with admin-controlled registration
   - Product ownership (seller_id on products)
   - RLS policies for seller-specific access
   - Admin seller management UI
   - Mobile app seller display
2. **Phase 3**: Product variants (sizes, colors) ✅ Completed
3. **Phase 4**: Shopping cart (client-side) ✅ Completed
4. **Phase 5**: Orders table + RLS ✅ Completed
5. **Phase 6**: Payments integration

**DO NOT** skip ahead. Each phase must be verified working before moving to the next.

---

## 📞 If Something Doesn't Work

1. Check browser console for errors
2. Check Supabase Dashboard > Database > Logs
3. Verify the table exists: `SELECT * FROM products LIMIT 1;`
4. Verify RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'products';`
5. Verify admin user has `is_admin: true` in metadata

If the React Native app shows "Unable to load products":
- Check if `isSupabaseConfigured()` returns `true`
- Verify network connectivity
- Check that products exist and `is_active = true`
