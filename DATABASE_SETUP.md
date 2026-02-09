# Database & Authentication Setup

This document explains how to set up the Supabase backend for the E-Commerce app with inventory management, user authentication, order history, **seller management**, **customer ratings**, and **return/replace tracking**.

## Features

- **User Authentication**: Email/password signup & login via Supabase Auth
- **Product Catalog**: Products with variants (size/color combinations)
- **Inventory Management**: Stock tracking per variant with movement audit trail
- **Order System**: COD-first orders with full history
- **Address Management**: Multiple delivery addresses per user
- **Seller Management**: Multi-vendor marketplace support
- **Customer Ratings**: Product reviews with aggregated summaries
- **Return/Replace System**: Complete return and replacement workflow

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Configure the App

Update `src/config/supabase.ts` with your credentials:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Run Database Migrations

In Supabase Dashboard > SQL Editor, run the migration files in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_extended_schema.sql
```

Or use the Supabase CLI:

```bash
npx supabase db push
```

### 4. Seed Sample Data (Optional)

Run the seed script to populate test products:

```
supabase/seed.sql
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `categories` | Product categories |
| `subcategories` | Product subcategories |
| `products` | Main product catalog |
| `product_variants` | Size/color combinations per product |
| `inventory` | Stock levels per variant |
| `stock_movements` | Audit trail for inventory changes |
| `addresses` | User delivery addresses |
| `orders` | Order headers |
| `order_items` | Individual items in each order |

### Extended Tables (Migration 002)

| Table | Description |
|-------|-------------|
| `sellers` | Seller/vendor accounts and business info |
| `customer_ratings` | Individual product ratings/reviews |
| `product_rating_summary` | Aggregated ratings per product |
| `rating_helpful_votes` | User votes on review helpfulness |
| `return_replace_requests` | Return and replacement requests |
| `return_replace_timeline` | Status history for requests |
| `order_item_timeline` | Delivery tracking per item |

### Key Relationships

```
sellers
  └── products (1:many)
        └── product_variants (1:many)
              └── inventory (1:1)
              └── stock_movements (1:many)
        └── customer_ratings (1:many)
        └── product_rating_summary (1:1)

profiles (auth.users)
  └── addresses (1:many)
  └── orders (1:many)
        └── order_items (1:many)
              └── order_item_timeline (1:many)
              └── return_replace_requests (1:many)
                    └── return_replace_timeline (1:many)
```

## Sellers

### Seller Registration

Sellers have their own accounts with business information:

```typescript
const result = await sellerService.registerSeller({
  businessName: 'Fashion Store',
  businessEmail: 'seller@example.com',
  businessPhone: '9876543210',
  gstNumber: 'GST123456789',
  city: 'Mumbai',
  state: 'Maharashtra',
});
```

### Seller Verification

Sellers can be verified by the platform after document review:
- `is_verified` flag indicates verification status
- `verification_documents` stores uploaded document URLs
- `commission_rate` determines platform commission percentage

### Seller Product Management

Sellers can manage their own products:

```typescript
// Get seller's products
const products = await sellerService.getSellerProducts(sellerId, {
  status: 'active',
  stockStatus: 'low_stock',
});

// Create a new product
await sellerService.createSellerProduct(sellerId, {
  name: 'Classic T-Shirt',
  brand: 'MyBrand',
  base_price: 999,
  is_returnable: true,
  return_window_days: 10,
});
```

## Customer Ratings

### Submitting Ratings

Customers can rate products they've purchased:

```typescript
const result = await ratingService.submitRating(userId, {
  productId: 'product-uuid',
  orderItemId: 'order-item-uuid',
  rating: 5,
  title: 'Great product!',
  reviewText: 'Really happy with my purchase.',
  images: ['https://...'],
});
```

### Rating Aggregation

Product rating summaries are automatically updated via database triggers:
- `average_rating` - Weighted average of all ratings
- `total_ratings` - Count of all ratings
- `rating_1_count` to `rating_5_count` - Distribution breakdown

### Helpful Votes

Users can vote on review helpfulness:

```typescript
await ratingService.voteRatingHelpful(userId, ratingId, true);
```

### Seller Responses

Sellers can respond to customer reviews:

```typescript
await ratingService.addSellerResponse(sellerId, ratingId, 'Thank you for your feedback!');
```

## Return/Replace System

### Eligibility Checking

Before allowing a return/replace request, check eligibility:

```typescript
const eligibility = await returnReplaceService.checkEligibility(orderItemId);
// Returns: { canReturn, canReplace, daysRemainingReturn, daysRemainingReplace }
```

### Submitting Requests

Customers can submit return or replacement requests:

```typescript
const result = await returnReplaceService.submitRequest(userId, {
  orderId: 'order-uuid',
  orderItemId: 'order-item-uuid',
  requestType: 'return',
  reason: 'damaged',
  description: 'Product arrived with a tear',
  customerImages: ['https://...'],
  pickupAddress: '123 Main St',
});
```

### Request Status Flow

```
requested → approved → pickup_scheduled → picked_up → inspection → completed
                    ↓
                  rejected
                    ↓
                 cancelled (by customer)
```

### Seller Actions

Sellers can manage return/replace requests:

```typescript
// Approve request
await returnReplaceService.approveRequest(requestId, sellerId);

// Schedule pickup
await returnReplaceService.schedulePickup(requestId, sellerId, '2026-02-05', 'FedEx');

// Complete with refund
await returnReplaceService.completeRequest(requestId, sellerId, {
  refundAmount: 999,
  notes: 'Full refund processed',
});
```

## Product Extensions

Products now include seller and return/replace settings:

| Field | Description |
|-------|-------------|
| `seller_id` | Link to seller (NULL for platform products) |
| `seller_sku` | Seller's internal SKU |
| `is_returnable` | Can be returned |
| `is_replaceable` | Can be replaced |
| `return_window_days` | Days allowed for return (default: 10) |
| `replace_window_days` | Days allowed for replacement (default: 10) |
| `warranty_months` | Warranty period in months |
| `cod_available` | COD payment available |
| `express_delivery_available` | Express shipping option |

## Order Item Extensions

Order items now include delivery tracking:

| Field | Description |
|-------|-------------|
| `item_status` | Individual item status |
| `seller_id` | Link to fulfilling seller |
| `delivered_at` | Delivery timestamp |
| `return_eligible_until` | Last date to return |
| `replace_eligible_until` | Last date to replace |
| `tracking_number` | Shipment tracking |
| `carrier` | Shipping carrier |
| `is_rated` | Has customer rated this item |

## Row Level Security (RLS)

All tables have RLS policies ensuring proper access:

- `profiles`: Users can view/update only their own profile
- `addresses`: Users can CRUD only their own addresses
- `orders`: Users can view/create only their own orders
- `order_items`: Access inherited through orders
- `sellers`: Sellers can manage their own record
- `products`: Sellers can CRUD their own products
- `customer_ratings`: Users can rate purchased products
- `return_replace_requests`: Users see their own requests

## Useful Queries

### Seller Dashboard Stats

```sql
SELECT 
  s.business_name,
  s.total_products,
  s.total_orders,
  s.total_revenue,
  s.average_rating
FROM sellers s
WHERE s.id = 'seller-uuid';
```

### Products with Low Stock

```sql
SELECT p.name, pv.size_label, pv.color_name, i.quantity_available
FROM inventory i
JOIN product_variants pv ON i.variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE p.seller_id = 'seller-uuid'
  AND i.quantity_available <= i.low_stock_threshold;
```

### Pending Return Requests

```sql
SELECT * FROM return_replace_requests
WHERE seller_id = 'seller-uuid'
  AND status IN ('requested', 'approved', 'pickup_scheduled')
ORDER BY created_at DESC;
```

### Top Rated Products

```sql
SELECT 
  p.name, 
  prs.average_rating,
  prs.total_ratings
FROM products p
JOIN product_rating_summary prs ON p.id = prs.product_id
WHERE prs.total_ratings >= 10
ORDER BY prs.average_rating DESC
LIMIT 10;
```

### Customer Order History with Eligibility

```sql
SELECT * FROM customer_order_history
WHERE user_id = 'user-uuid'
ORDER BY ordered_at DESC;
```

## Triggers

The schema includes several automatic triggers:

| Trigger | Table | Action |
|---------|-------|--------|
| `set_order_number` | orders | Auto-generate order numbers |
| `set_request_number` | return_replace_requests | Auto-generate request numbers |
| `on_rating_created` | customer_ratings | Update rating summary |
| `on_order_item_delivered` | order_items | Set return/replace eligibility dates |
| `on_return_status_changed` | return_replace_requests | Add timeline entry |
| `update_*_updated_at` | Various | Auto-update timestamps |

## Environment Variables

For production, use environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Then in your config:
```typescript
import Config from 'react-native-config';

const SUPABASE_URL = Config.SUPABASE_URL;
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY;
```

## Troubleshooting

### "Not authenticated" errors
- Ensure user is logged in
- Check that Supabase credentials are correct
- Verify RLS policies are not blocking access

### Orders not showing
- Check if `isSupabaseConfigured()` returns true
- Verify the orders exist in Supabase dashboard
- Pull to refresh on Orders screen

### Ratings not updating
- Ensure the `update_product_rating_summary` trigger exists
- Check that the rating is marked as `is_approved = true`
- Verify the product_rating_summary table exists

### Return requests failing
- Verify order item has `delivered_at` timestamp set
- Check that eligibility window hasn't expired
- Ensure no pending request exists for that item
