# Phase 2: Seller System Implementation

## Overview

This document describes the implementation of the **Seller System** for the marketplace. The seller system introduces controlled multi-vendor support where:

- **Admin** has full control over all sellers and products
- **Sellers** can only manage their own products
- **Users** can browse and purchase from any seller

## Role Model

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to everything. Create/manage sellers, assign any product to any seller, view all orders |
| **Seller** | Manage own products only, view order_items for their products, update own profile (limited) |
| **User** | Browse products, place orders (read-only access) |

### Critical Rules:
1. Sellers **CANNOT** self-register
2. Admin manually creates and approves sellers
3. Admin can activate/deactivate sellers at any time
4. Sellers cannot modify their own `is_active` or `is_verified` status

---

## Database Changes

### 1. Sellers Table

```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_address TEXT,
  is_active BOOLEAN DEFAULT false,  -- Starts inactive
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_seller_user UNIQUE (user_id)
);
```

**Key Design Decisions:**
- `user_id` links seller to a Supabase Auth user
- `is_active` controls whether seller can operate (only admin can modify)
- `is_verified` adds a "Verified Seller" badge
- One seller profile per auth user (enforced by unique constraint)

### 2. Products Table Modification

Added column:
```sql
ALTER TABLE products ADD COLUMN seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;
```

**How it works:**
- Products with `seller_id = NULL` are considered "platform products"
- Products with a valid `seller_id` belong to that seller
- If a seller is deleted, products remain but become unassigned

### 3. Database View

```sql
CREATE VIEW products_with_seller AS
SELECT 
  p.*,
  s.store_name as seller_store_name,
  s.is_verified as seller_is_verified
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.id AND s.is_active = true;
```

This view is used by the mobile app to fetch products with seller info in a single query.

---

## Row Level Security (RLS) Policies

### Sellers Table

| Policy | Who | What |
|--------|-----|------|
| Admin full access | `is_admin = true` | Full CRUD |
| Sellers view own profile | `auth.uid() = user_id` | SELECT only |
| Sellers update own profile | `auth.uid() = user_id` | UPDATE (limited by trigger) |

**Trigger Protection:**
A database trigger `prevent_seller_status_change()` prevents non-admins from modifying `is_active` or `is_verified` fields.

### Products Table

| Policy | Who | What |
|--------|-----|------|
| Public view active | Anyone | SELECT where `is_active = true` |
| Admin full access | `is_admin = true` | Full CRUD |
| Sellers view own | Active sellers | SELECT where `seller_id` matches their seller profile |
| Sellers insert own | Active sellers | INSERT where `seller_id` matches their seller profile |
| Sellers update own | Active sellers | UPDATE where `seller_id` matches their seller profile |
| Sellers delete own | Active sellers | DELETE where `seller_id` matches their seller profile |

### Order Items Table

| Policy | Who | What |
|--------|-----|------|
| Sellers view own | Sellers | SELECT where order_item's `product_id` belongs to their products |
| Admin full access | `is_admin = true` | Full CRUD |

---

## Admin Dashboard Changes

### Sellers Page (`admin-dashboard/src/pages/Sellers.tsx`)

New functionality:
- **Create Seller**: Creates Supabase Auth user + seller profile in one flow
- **Toggle Active**: Click badge to activate/deactivate
- **Toggle Verified**: Click badge to add/remove verification
- **View Products Count**: Shows how many products each seller has
- **Search**: Filter by store name or email

**Creating a New Seller:**
1. Admin enters email + password (creates auth user)
2. Admin fills store information
3. Seller starts as **inactive** by default
4. Admin must explicitly activate the seller

### Products Page (`admin-dashboard/src/pages/Products.tsx`)

New features:
- **Seller Filter**: Filter products by seller in the filter bar
- **Assign to Seller**: Dropdown to assign product to a seller
- **Display Name Override**: Optional manual seller name override

**Product Creation Flow:**
1. Admin selects seller from dropdown (or leaves as "No seller")
2. If seller selected, `seller_id` is saved with the product
3. `seller_name` field auto-populates from selected seller

---

## Mobile App Changes

### ProductCard (`src/components/product/ProductCard.tsx`)

Added subtle seller display:
```tsx
{product.sellerName && (
  <Text style={styles.sellerName}>
    Sold by {product.sellerName}
  </Text>
)}
```

Style:
- Small, italic text
- Uses `colors.textTertiary` for subtlety
- Appears below product name, above price

### ProductDetailsScreen (`src/screens/product/ProductDetailsScreen.tsx`)

Already displays seller name (lines 254-260):
```tsx
{product.sellerName && (
  <View style={styles.sellerSection}>
    <Icon name="storefront" size={14} color={colors.textTertiary} />
    <Text style={styles.sellerText}>Sold by {product.sellerName}</Text>
  </View>
)}
```

### ProductService (`src/services/productService.ts`)

Updated to use `products_with_seller` view:
```typescript
const { data, error } = await getSupabase()
  .from('products_with_seller')  // View with seller info
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

**Seller Name Priority:**
1. `seller_store_name` from the view (actual seller)
2. `seller_name` field on product (manual override/fallback)

---

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/007_seller_system.sql` | Complete SQL migration |
| `admin-dashboard/src/pages/Sellers.tsx` | Complete rewrite for new schema |
| `admin-dashboard/src/pages/Products.tsx` | Added seller filter & assignment |
| `admin-dashboard/src/lib/supabase.ts` | Updated Seller interface, added seller_id to Product |
| `src/components/product/ProductCard.tsx` | Added seller name display |
| `src/services/productService.ts` | Use products_with_seller view |

---

## Security Considerations

### What's Protected:
1. **Seller creation** - Only admin can create sellers via dashboard
2. **Seller status** - Database trigger prevents sellers from changing own status
3. **Product ownership** - RLS ensures sellers only see/modify their products
4. **Order visibility** - Sellers only see order_items for their products

### What's NOT Done in Frontend:
- Service role key is NOT used in frontend
- RLS is NOT disabled
- All protection is at database level

### Helper Functions

```sql
-- Check if current user is an active seller
CREATE FUNCTION is_active_seller() RETURNS BOOLEAN

-- Get current user's seller_id
CREATE FUNCTION get_my_seller_id() RETURNS UUID
```

---

## Testing Checklist

### Admin Tests:
- [ ] Create new seller (with auth user)
- [ ] Activate/deactivate seller
- [ ] Verify/unverify seller
- [ ] Delete seller (products should remain unassigned)
- [ ] Assign product to seller
- [ ] Filter products by seller

### Seller Tests (future):
- [ ] Seller login shows only their products
- [ ] Seller cannot see other sellers' products
- [ ] Seller cannot modify is_active/is_verified
- [ ] Seller can view order_items for their products

### Mobile Tests:
- [ ] Product card shows seller name
- [ ] Product details shows seller name
- [ ] Products from inactive sellers still show seller name

---

## Future Enhancements

Not implemented in this phase:
- Seller self-dashboard (separate login/UI)
- Inventory management per seller
- Seller analytics/reports
- Commission system
- Seller ratings
- Split payments

These are deferred to future phases to keep this implementation incremental and stable.
