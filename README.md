# 🛒 E-Commerce Platform

## The Complete Technical Blueprint

**Version:** 2.0.0  
**Last Updated:** February 2026  
**Status:** Production-Ready  
**Maintainer:** Engineering Team

---

## 📖 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Component-Level Architecture](#3-component-level-architecture)
4. [Database Design (Final & Approved)](#4-database-design-final--approved)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Order Lifecycle (Critical)](#6-order-lifecycle-critical)
7. [Common Failure Points & Solutions](#7-common-failure-points--solutions)
8. [Incremental Development Roadmap](#8-incremental-development-roadmap)
9. [Rules for Future Development](#9-rules-for-future-development)
10. [Quick Start Guide](#10-quick-start-guide)

---

## 1. Executive Summary

This is a **production-grade mobile e-commerce platform** built with React Native (mobile), Vite/React (admin dashboard), and Supabase (backend). The system supports:

- 📱 **User Mobile App** — Browse, search, purchase products
- 🖥️ **Admin Dashboard** — Product management, order fulfillment
- 🗄️ **Supabase Backend** — Auth, PostgreSQL database, file storage

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Database-First** | UI never assumes success. All writes wait for DB confirmation. |
| **Snapshot Pattern** | Order data captures product/address state at purchase time. |
| **Separation of Concerns** | Screen → Hook → Service → Supabase pipeline. |
| **No Silent Failures** | Every error is logged, caught, and surfaced to the user. |

---

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                             │
├─────────────────────────────────────┬───────────────────────────────────┤
│          📱 MOBILE APP              │          🖥️ ADMIN DASHBOARD        │
│         (React Native)              │            (Vite + React)          │
│                                     │                                    │
│  • Product Browsing                 │  • Product Management (CRUD)       │
│  • Cart & Checkout                  │  • Order Fulfillment               │
│  • User Profile & Addresses         │  • Inventory Tracking              │
│  • Order History                    │  • Seller Management               │
│  • Wishlist                         │  • Analytics Dashboard             │
└─────────────────────────────────────┴───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             SUPABASE BACKEND                             │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   🔐 AUTH       │   📊 DATABASE   │   📁 STORAGE    │   ⚡ REALTIME     │
│                 │                 │                 │                   │
│ • Email/Pass    │ • PostgreSQL    │ • Product Imgs  │ • Order Updates   │
│ • Social Login  │ • RLS Policies  │ • User Avatars  │ • Stock Alerts    │
│ • JWT Tokens    │ • Triggers      │ • Documents     │ • Notifications   │
└─────────────────┴─────────────────┴─────────────────┴───────────────────┘
```

### Layer Responsibilities

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Mobile App** | React Native | Consumer storefront, browsing, purchasing |
| **Admin Dashboard** | Vite + React | Business operations, product/order management |
| **Supabase Auth** | Supabase Auth | Identity management, JWT tokens, session handling |
| **Database** | PostgreSQL | Single source of truth for all data |
| **Storage** | Supabase Storage | Binary files (images, documents) |
| **Realtime** | Supabase Realtime | Live updates for orders, inventory |

---

## 3. Component-Level Architecture

### The Golden Rule: Separation of Concerns

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW PIPELINE                                │
│                                                                           │
│   SCREEN          HOOK              SERVICE           SUPABASE            │
│  (UI Only)   (State Mgmt)       (Business Logic)    (DB/Auth)            │
│                                                                           │
│  ┌────────┐    ┌────────┐        ┌────────────┐    ┌──────────┐          │
│  │        │    │        │        │            │    │          │          │
│  │ Render │───▶│ useState│───▶   │ Transform  │───▶│ Query    │          │
│  │ Layout │    │ Loading │        │ Validate   │    │ Insert   │          │
│  │ Events │◀───│ Error   │◀───   │ Log Errors │◀───│ Update   │          │
│  │        │    │ Success │        │            │    │          │          │
│  └────────┘    └────────┘        └────────────┘    └──────────┘          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Strict Rules: What Goes Where

| Layer | Location | ALLOWED | NOT ALLOWED |
|-------|----------|---------|-------------|
| **Screens** | `src/screens/` | JSX, layout, event handlers, navigation | API calls, business logic, data transforms |
| **Hooks** | `src/hooks/` | useState, useEffect, call services, manage loading/error states | Direct Supabase calls, complex business logic |
| **Services** | `src/services/` | Supabase SDK calls, data transformation (DB → App types), error logging | UI logic, useState, React components |
| **Stores** | `src/store/` | Global state (cart, auth user), computed values | Network calls, side effects |
| **Types** | `src/types/` | TypeScript interfaces, type definitions | Business logic, default values |

### Example: Correct vs. Incorrect

```typescript
// ❌ WRONG: API call in Screen
const CheckoutScreen = () => {
  const handlePlaceOrder = async () => {
    const { data } = await supabase.from('orders').insert({...}); // BAD!
  };
};

// ✅ CORRECT: Screen calls Hook, Hook calls Service
const CheckoutScreen = () => {
  const { placeOrder, isLoading, error } = useOrderActions();
  
  const handlePlaceOrder = async () => {
    const result = await placeOrder(orderData);
    if (result.success) navigation.navigate('OrderSuccess');
  };
};

// In services/orderService.ts
export const orderService = {
  async createOrder(data: CreateOrderData): Promise<OrderResult> {
    const { data: order, error } = await getSupabase()
      .from('orders')
      .insert(transformToDbFormat(data))
      .select()
      .single();
    
    if (error) {
      console.error('OrderService: Insert failed', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, order: transformToAppFormat(order) };
  }
};
```

---

## 4. Database Design (Final & Approved)

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA (v2.0)                            │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐       ┌──────────────┐       ┌──────────────────────┐
  │   profiles   │       │   sellers    │       │      categories      │
  │──────────────│       │──────────────│       │──────────────────────│
  │ id (PK, FK)  │       │ id (PK)      │       │ id (PK)              │
  │ full_name    │       │ business_name│       │ name                 │
  │ phone        │       │ email        │       │ image_url            │
  │ avatar_url   │       │ is_verified  │       └──────────┬───────────┘
  └──────┬───────┘       └──────┬───────┘                  │
         │                      │                          │
         │                      │         ┌────────────────┴───────────┐
         │                      │         │       subcategories        │
         │                      │         │────────────────────────────│
         │                      │         │ id (PK)                    │
         │                      │         │ category_id (FK)           │
         │                      │         │ name                       │
         │                      │         └────────────────┬───────────┘
         │                      │                          │
  ┌──────┴───────┐             │                          │
  │  addresses   │              │         ┌────────────────┴───────────┐
  │──────────────│              ├────────▶│         products           │
  │ id (PK)      │              │         │────────────────────────────│
  │ user_id (FK) │              │         │ id (PK)                    │
  │ name         │              │         │ seller_id (FK) ◀───────────┤
  │ phone        │              │         │ subcategory_id (FK)        │
  │ address_line_1│             │         │ name, brand, price         │
  │ address_line_2│             │         │ is_returnable              │
  │ city, state  │              │         │ is_active                  │
  │ pincode      │              │         └────────────────┬───────────┘
  │ is_default   │              │                          │
  └──────┬───────┘              │                          │
         │                      │         ┌────────────────┴───────────┐
         │                      │         │     product_variants       │
         │                      │         │────────────────────────────│
         │                      │         │ id (PK)                    │
         │                      │         │ product_id (FK)            │
         │                      │         │ size_label, color_name     │
         │                      │         │ price_adjustment           │
         │                      │         └────────────────┬───────────┘
  ┌──────┴───────────────────────────────────────────────────────────────┐
  │                                                                       │
  │   ┌──────────────────┐              ┌──────────────────────────────┐ │
  │   │      orders      │              │        order_items           │ │
  │   │──────────────────│              │──────────────────────────────│ │
  │   │ id (PK)          │──────────────│ id (PK)                      │ │
  │   │ user_id (FK)     │              │ order_id (FK) ◀──────────────┤ │
  │   │ address_id (FK)  │              │ product_id (FK)              │ │
  │   │                  │              │                              │ │
  │   │ // SNAPSHOT      │              │ // SNAPSHOT (frozen data)    │ │
  │   │ delivery_name    │              │ product_name                 │ │
  │   │ delivery_phone   │              │ product_brand                │ │
  │   │ delivery_address │              │ product_image                │ │
  │   │ delivery_city    │              │ unit_price                   │ │
  │   │ delivery_pincode │              │ size_label                   │ │
  │   │                  │              │ color_name                   │ │
  │   │ status           │              │ quantity                     │ │
  │   │ total_amount     │              │ total_price                  │ │
  │   └──────────────────┘              └──────────────────────────────┘ │
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘
```

### Table Definitions with Explanations

#### `profiles` — User Account Data
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Why:** Supabase Auth manages authentication, but `profiles` extends user data with app-specific fields. This follows the "extend, don't modify" principle.

---

#### `addresses` — Delivery Locations
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  type TEXT DEFAULT 'home',
  is_default BOOLEAN DEFAULT false
);
```
**Important:** Column names use `address_line_1` and `address_line_2`, NOT `address` and `locality`. The service layer transforms these to the app's expected format.

---

#### `products` — Product Catalog
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  subcategory_id UUID REFERENCES subcategories(id),
  name TEXT NOT NULL,
  brand TEXT,
  base_price NUMERIC(12,2) NOT NULL,
  mrp NUMERIC(12,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_returnable BOOLEAN DEFAULT true,
  return_window_days INTEGER DEFAULT 10
);
```

---

#### `orders` — Order Headers
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_number TEXT NOT NULL,
  address_id UUID REFERENCES addresses(id),
  
  -- SNAPSHOT: Frozen address data at order time
  delivery_name TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_state TEXT NOT NULL,
  delivery_pincode TEXT NOT NULL,
  
  status TEXT DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  
  subtotal NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  delivery_charge NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### `order_items` — Individual Line Items
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  
  -- SNAPSHOT: Frozen product data at order time
  product_name TEXT NOT NULL,
  product_brand TEXT,
  product_image TEXT,
  size_label TEXT,
  color_name TEXT,
  color_hex TEXT,
  
  unit_price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(12,2) NOT NULL
);
```

---

### ❓ Why `orders` and `order_items` Are Separate

| Reason | Explanation |
|--------|-------------|
| **1. Database Normalization** | An order can have MANY items. A single row can't represent multiple products efficiently. |
| **2. Aggregate vs. Line-Item Data** | `orders` holds header data (total, address, status). `order_items` holds per-product data (quantity, price, variant). |
| **3. Historical Integrity** | Each `order_item` snapshots the product state at purchase. Even if the product changes later, the order history remains accurate. |
| **4. Multi-Vendor Support** | In Phase 3, each `order_item` can belong to a different `seller_id`, enabling split shipments and seller-specific tracking. |
| **5. Query Performance** | Fetching order summaries doesn't require loading all item details. You can aggregate (`SUM`, `COUNT`) on items separately. |

### Plain English Relationships

- **A user HAS MANY addresses** (home, work, etc.)
- **A user HAS MANY orders** (purchase history)
- **An order HAS MANY order_items** (products in that order)
- **An order_item BELONGS TO one product** (but snapshots product data)
- **A product BELONGS TO one seller** (multi-vendor support)
- **A seller HAS MANY products** (their catalog)

---

## 5. Data Flow Diagrams

### A. Login Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER LOGIN FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

  User                  LoginScreen              authService            Supabase Auth
   │                        │                        │                       │
   │   Enter Credentials    │                        │                       │
   ├───────────────────────▶│                        │                       │
   │                        │                        │                       │
   │                        │   signIn(email, pwd)   │                       │
   │                        ├───────────────────────▶│                       │
   │                        │                        │                       │
   │                        │                        │  signInWithPassword   │
   │                        │                        ├──────────────────────▶│
   │                        │                        │                       │
   │                        │                        │     JWT + User Data   │
   │                        │                        │◀──────────────────────┤
   │                        │                        │                       │
   │                        │   { success, user }    │                       │
   │                        │◀───────────────────────┤                       │
   │                        │                        │                       │
   │                        │  userStore.login(user) │                       │
   │                        ├───────────────────────▶│                       │
   │                        │                        │                       │
   │   Navigate to Home     │                        │                       │
   │◀───────────────────────┤                        │                       │
   │                        │                        │                       │
```

### B. Add Address Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADD ADDRESS FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

  User            AddAddressScreen         addressService           Supabase DB
   │                    │                       │                       │
   │  Fill Form         │                       │                       │
   ├───────────────────▶│                       │                       │
   │                    │                       │                       │
   │  Press Save        │                       │                       │
   ├───────────────────▶│                       │                       │
   │                    │                       │                       │
   │                    │  Validate Form        │                       │
   │                    ├───────────┐           │                       │
   │                    │           │           │                       │
   │                    │◀──────────┘           │                       │
   │                    │                       │                       │
   │                    │  addAddress({         │                       │
   │                    │    name,              │                       │
   │                    │    phone,             │                       │
   │                    │    address_line_1,    │  Wait for DB confirm  │
   │                    │    city, ...          │                       │
   │                    │  })                   │                       │
   │                    ├──────────────────────▶│                       │
   │                    │                       │                       │
   │                    │                       │  INSERT addresses     │
   │                    │                       │  + RLS check          │
   │                    │                       ├──────────────────────▶│
   │                    │                       │                       │
   │                    │                       │  { data, error }      │
   │                    │                       │◀──────────────────────┤
   │                    │                       │                       │
   │                    │  Transform DB → App   │                       │
   │                    │  Return result        │                       │
   │                    │◀──────────────────────┤                       │
   │                    │                       │                       │
   │  Show Success OR   │                       │                       │
   │  Show Error        │                       │                       │
   │◀───────────────────┤                       │                       │
```

**Critical:** The screen waits for `addressService` to return. UI confirmation happens AFTER database success.

---

### C. Place Order Flow (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLACE ORDER FLOW                                 │
│                    ⚠️ MOST CRITICAL FLOW IN THE SYSTEM                   │
└─────────────────────────────────────────────────────────────────────────┘

  User          CheckoutScreen          orderService              Supabase DB
   │                  │                      │                         │
   │  Tap Place Order │                      │                         │
   ├─────────────────▶│                      │                         │
   │                  │                      │                         │
   │                  │──┐ Validate:         │                         │
   │                  │  │ - Address exists  │                         │
   │                  │  │ - Cart not empty  │                         │
   │                  │◀─┘                   │                         │
   │                  │                      │                         │
   │                  │  createOrder({       │                         │
   │                  │    items,            │                         │
   │                  │    address,          │                         │
   │                  │    paymentMethod,    │                         │
   │                  │    amounts           │                         │
   │                  │  })                  │                         │
   │                  ├─────────────────────▶│                         │
   │                  │                      │                         │
   │                  │                      │──┐ STEP 1: Get User     │
   │                  │                      │  │ from auth.getUser()  │
   │                  │                      │◀─┘                      │
   │                  │                      │                         │
   │                  │                      │  STEP 2: INSERT orders  │
   │                  │                      │  (with SNAPSHOT data)   │
   │                  │                      ├────────────────────────▶│
   │                  │                      │                         │
   │                  │                      │  order.id returned      │
   │                  │                      │◀────────────────────────┤
   │                  │                      │                         │
   │                  │                      │  STEP 3: INSERT         │
   │                  │                      │  order_items[]          │
   │                  │                      │  (with SNAPSHOT data)   │
   │                  │                      ├────────────────────────▶│
   │                  │                      │                         │
   │                  │                      │  items created          │
   │                  │                      │◀────────────────────────┤
   │                  │                      │                         │
   │                  │  { success: true,    │                         │
   │                  │    order: {...} }    │                         │
   │                  │◀─────────────────────┤                         │
   │                  │                      │                         │
   │                  │  userStore.addOrder  │                         │
   │                  │  bagStore.clearBag   │                         │
   │                  ├─────────────────────▶│                         │
   │                  │                      │                         │
   │  Navigate to     │                      │                         │
   │  OrderSuccess    │                      │                         │
   │◀─────────────────┤                      │                         │
```

---

### D. Fetch My Orders Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FETCH MY ORDERS FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

  OrdersScreen           orderService                      Supabase DB
       │                      │                                 │
       │  useFocusEffect()    │                                 │
       │──────────────────────│                                 │
       │                      │                                 │
       │  getOrders()         │                                 │
       ├─────────────────────▶│                                 │
       │                      │                                 │
       │                      │  SELECT * FROM orders           │
       │                      │  WHERE user_id = auth.uid()     │
       │                      │  ORDER BY created_at DESC       │
       │                      ├────────────────────────────────▶│
       │                      │                                 │
       │                      │  orders[]                       │
       │                      │◀────────────────────────────────┤
       │                      │                                 │
       │                      │  SELECT * FROM order_items      │
       │                      │  WHERE order_id IN (ids)        │
       │                      ├────────────────────────────────▶│
       │                      │                                 │
       │                      │  items[]                        │
       │                      │◀────────────────────────────────┤
       │                      │                                 │
       │                      │──┐ Transform:                   │
       │                      │  │ - Join orders + items        │
       │                      │  │ - Convert DB → App types     │
       │                      │◀─┘                              │
       │                      │                                 │
       │  { orders: [...] }   │                                 │
       │◀─────────────────────┤                                 │
       │                      │                                 │
       │  Render FlatList     │                                 │
       │──────────────────────│                                 │
```

---

## 6. Order Lifecycle (Critical)

### What Happens When User Clicks "Place Order"

```
┌─────────────────────────────────────────────────────────────────────────┐
│               ORDER PLACEMENT - STEP BY STEP                             │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: VALIDATION (Frontend)
├── ✓ Address is selected and valid
├── ✓ Cart has at least 1 item
├── ✓ User is authenticated
└── ✓ Supabase is configured

STEP 2: BUILD ORDER OBJECT (Service Layer)
├── Generate order_number: "ORD-20260207-4521"
├── Snapshot delivery address fields:
│   ├── delivery_name     ← from address.name
│   ├── delivery_phone    ← from address.phone
│   ├── delivery_address  ← from address.address + locality
│   ├── delivery_city     ← from address.city
│   ├── delivery_state    ← from address.state
│   └── delivery_pincode  ← from address.pincode
├── Set payment_method, payment_status
└── Calculate subtotal, discount, delivery_charge, total_amount

STEP 3: INSERT ORDER (Database)
├── INSERT INTO orders VALUES (...)
├── RLS Policy Check: auth.uid() == user_id ✓
└── Return: order.id (UUID)

STEP 4: BUILD ORDER ITEMS (Service Layer)
├── For each cart item:
│   ├── Snapshot product_name   ← from product.name
│   ├── Snapshot product_brand  ← from product.brand
│   ├── Snapshot product_image  ← from product.images[0]
│   ├── Snapshot unit_price     ← from product.price
│   ├── Record size_label       ← from selectedSize
│   ├── Record color_name       ← from selectedColor
│   └── Calculate total_price   ← unit_price × quantity
└── Build array of order_items

STEP 5: INSERT ORDER ITEMS (Database)
├── INSERT INTO order_items VALUES (bulk insert)
├── RLS Policy Check: order.user_id == auth.uid() ✓
└── Return: success

STEP 6: ON FAILURE (Rollback)
└── If items fail → DELETE FROM orders WHERE id = order.id

STEP 7: SUCCESS RESPONSE
├── Clear cart (bagStore.clearBag)
├── Add to local store (userStore.addOrder)
└── Navigate to OrderSuccessScreen
```

### Tables Written During Order Placement

| Table | Data Written | Why Snapshot? |
|-------|-------------|---------------|
| `orders` | Order header + delivery address snapshot | Address may be edited/deleted later |
| `order_items` | Product snapshot + variant + pricing | Product may change price or become unavailable |

### What Data Is Snapshotted

**Address Snapshot (in `orders`):**
```
delivery_name      ← "John Doe"
delivery_phone     ← "9876543210"  
delivery_address   ← "123 Main St, Apt 4B"
delivery_city      ← "Mumbai"
delivery_state     ← "Maharashtra"
delivery_pincode   ← "400001"
```

**Product Snapshot (in `order_items`):**
```
product_name       ← "Classic Navy Polo Shirt"
product_brand      ← "Myntra Style"
product_image      ← "https://storage.../image.jpg"
unit_price         ← 1299.00
size_label         ← "L"
color_name         ← "Navy Blue"
```

### How "My Orders" Fetches Data

```sql
-- Step 1: Fetch all orders for user
SELECT * FROM orders
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- Step 2: Fetch all items for those orders
SELECT * FROM order_items
WHERE order_id IN (order_ids_from_step_1);

-- Step 3: (Optional) Fetch linked addresses
SELECT * FROM addresses
WHERE id IN (address_ids_from_orders);
```

The service then joins these in-memory and transforms to the app's `Order` type.

---

## 7. Common Failure Points & Solutions

### 🐛 Bug #1: Address Saved in UI but Not in Database

**Symptom:** User adds address, sees success toast, but address doesn't appear on refresh.

**Root Cause:** UI showed success BEFORE waiting for database confirmation.

```typescript
// ❌ WRONG: Optimistic update without DB confirmation
const handleSave = async () => {
  userStore.addAddress(newAddress);  // Updates UI immediately
  await addressService.addAddress(newAddress);  // May fail silently
  navigation.goBack();
};

// ✅ CORRECT: Wait for DB, then update UI
const handleSave = async () => {
  setLoading(true);
  const result = await addressService.addAddress(newAddress);
  
  if (result.error) {
    Alert.alert('Error', result.error);
    setLoading(false);
    return;
  }
  
  userStore.addAddress(result.address!);  // Only after DB success
  navigation.goBack();
};
```

---

### 🐛 Bug #2: Orders Show Success but Not in Database

**Symptom:** User sees "Order Placed!" but order doesn't appear in My Orders.

**Root Causes & Fixes:**

| Cause | Solution |
|-------|----------|
| Schema mismatch (wrong column names) | Service uses exact DB column names from migration |
| RLS policy blocking insert | Verify `user_id` matches `auth.uid()` |
| Missing required columns | All NOT NULL columns must have values |
| Invalid UUID for address_id | Validate UUID format before sending |

**Our Implementation (orderService.ts):**
```typescript
// Build order insert matching ALL required columns in the actual DB
const orderInsert = {
  user_id: user.id,
  order_number: this.generateOrderNumber(),
  address_id: validAddressId,  // null if invalid UUID
  
  // REQUIRED: Delivery address snapshot
  delivery_name: data.address.name,
  delivery_phone: data.address.phone,
  delivery_address: [data.address.address, data.address.locality].filter(Boolean).join(', '),
  delivery_city: data.address.city,
  delivery_state: data.address.state,
  delivery_pincode: data.address.pincode,
  
  // REQUIRED: Payment & pricing
  payment_method: data.paymentMethod,
  payment_status: 'pending',
  subtotal: data.subtotal,
  discount_amount: data.discount,
  delivery_charge: data.deliveryCharge,
  total_amount: data.totalAmount,
  
  status: 'confirmed',
  estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
};
```

---

### 🐛 Bug #3: Schema Mismatch Issues

**Symptom:** Insert fails with "column X does not exist" or "violates not-null constraint".

**Root Cause:** Frontend code uses different column names than the actual database.

**Prevention Strategy:**

1. **Document Actual Schema:** Every service file has a comment block with real column names:
   ```typescript
   // =====================================================
   // ACTUAL DATABASE SCHEMA (verified via Supabase OpenAPI):
   // =====================================================
   // addresses:
   //   id, user_id, name, phone,
   //   address_line_1, address_line_2, city, state, pincode,
   //   type, is_default, created_at, updated_at
   // =====================================================
   ```

2. **Transform Functions:** Use explicit transforms between DB and App formats:
   ```typescript
   const dbAddressToAppAddress = (dbAddress: any): Address => ({
     id: dbAddress.id,
     name: dbAddress.name,
     address: dbAddress.address_line_1,      // DB → App mapping
     locality: dbAddress.address_line_2 || '',
     // ...
   });
   ```

3. **TypeScript Types:** Define DB types separately from App types:
   ```typescript
   // types/database.ts
   interface DbAddress {
     id: string;
     address_line_1: string;  // Matches DB exactly
     address_line_2: string | null;
   }
   
   // types/index.ts
   interface Address {
     id: string;
     address: string;  // App-friendly name
     locality: string;
   }
   ```

---

### 🐛 Bug #4: Silent Failures

**Prevention:** Every service function follows this pattern:

```typescript
async function serviceMethod(): Promise<{ data?: T; error?: string }> {
  try {
    const { data, error } = await supabase.from('table').insert(...);
    
    if (error) {
      console.error('📦 ServiceName.method: Error', JSON.stringify(error, null, 2));
      return { error: error.message };
    }
    
    console.log('📦 ServiceName.method: Success, ID:', data.id);
    return { data: transformedData };
    
  } catch (exception) {
    console.error('📦 ServiceName.method: Exception', exception);
    return { error: 'Unexpected error: ' + (exception as Error).message };
  }
}
```

---

## 8. Incremental Development Roadmap

### Phase 1: Single Seller MVP ✅ (Current)

**Goal:** Working e-commerce flow with one seller (platform itself).

| Feature | Status | Notes |
|---------|--------|-------|
| User Auth (Email/Password) | ✅ Done | Supabase Auth |
| Product Catalog | ✅ Done | Flat product table |
| Cart Management | ✅ Done | Zustand store + AsyncStorage |
| Checkout Flow | ✅ Done | COD-first |
| Order History | ✅ Done | With snapshot pattern |
| Address Management | ✅ Done | CRUD with RLS |
| Admin Product CRUD | ✅ Done | Web dashboard |

**Schema:**
- `products` with simple `stock` column
- No `seller_id` (implicit single seller)
- Basic `orders` and `order_items`

---

### Phase 2: Product Variants (Size, Color, Inventory)

**Goal:** Support multiple variants per product with granular stock tracking.

| Feature | Priority | Complexity |
|---------|----------|------------|
| `product_variants` table | High | Medium |
| `inventory` table | High | Medium |
| `stock_movements` audit trail | Medium | Low |
| Variant selection in UI | High | Medium |
| Low-stock alerts | Low | Low |

**New Tables:**
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  size_label TEXT,          -- "S", "M", "L", "XL"
  color_name TEXT,          -- "Navy Blue"
  color_hex TEXT,           -- "#1E3A5F"
  price_adjustment NUMERIC, -- +/- from base price
  sku TEXT UNIQUE
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  variant_id UUID REFERENCES product_variants(id),
  quantity_available INTEGER,
  quantity_reserved INTEGER,
  low_stock_threshold INTEGER DEFAULT 5
);
```

**Migration Strategy:**
1. Add new tables
2. Update `productService` to fetch variants
3. Add `dbProductToAppProduct` transform that flattens variants for existing UI
4. Gradually update UI to show variant selectors

---

### Phase 3: Multi-Vendor Marketplace

**Goal:** Multiple sellers with their own products and order fulfillment.

| Feature | Priority | Complexity |
|---------|----------|------------|
| `sellers` table | High | Medium |
| Seller verification | High | Medium |
| Add `seller_id` to products | High | Low |
| Per-seller RLS policies | High | High |
| Split order fulfillment | Medium | High |
| Seller commission tracking | Low | Medium |

**Key Changes:**
- `products.seller_id` → Links to seller
- `order_items.seller_id` → For multi-seller orders
- Each order_item can have different fulfillment status
- RLS policies check seller ownership

---

### Phase 4: Payments & Webhooks

**Goal:** Integrated payment processing with real-time status updates.

| Feature | Priority | Complexity |
|---------|----------|------------|
| Razorpay/Stripe integration | High | High |
| Payment webhooks | High | High |
| `payment_transactions` table | High | Medium |
| Refund processing | Medium | High |
| Invoice generation | Low | Medium |

**Flow:**
1. User initiates payment → Redirect to gateway
2. Gateway processes payment
3. Webhook hits our Edge Function
4. Edge Function updates `orders.payment_status`
5. Supabase Realtime notifies mobile app
6. App shows confirmation

---

## 9. Rules for Future Development

### Rule 1: When Adding a New Table

**Checklist:**
- [ ] Create migration file: `supabase/migrations/XXX_descriptive_name.sql`
- [ ] Add RLS policies in the same migration
- [ ] Create TypeScript types in `src/types/database.ts`
- [ ] Create service file in `src/services/newTableService.ts`
- [ ] Add transform functions (DB → App, App → DB)
- [ ] Update this README with table documentation
- [ ] Add to `DATABASE_SETUP.md` for quick reference

---

### Rule 2: Frontend Must Validate Backend Schema

**Before writing insert/update code:**

1. **Check Supabase Dashboard** → Table Editor → View columns
2. **Or use OpenAPI spec:** `https://your-project.supabase.co/rest/v1/?apikey=your-anon-key`
3. **Document in service file:**
   ```typescript
   // ACTUAL COLUMNS: id, user_id, col_1, col_2, ...
   ```
4. **Test with minimal insert** before adding to full flow

---

### Rule 3: How to Avoid Silent Failures

```typescript
// ✅ ALWAYS: Return structured result
async function createThing(data: Input): Promise<{ thing?: Thing; error?: string }> {
  try {
    // Log input
    console.log('📦 ThingService.create: Starting with', data);
    
    const { data: result, error } = await supabase.from('things').insert(data).select().single();
    
    // Log result or error
    if (error) {
      console.error('📦 ThingService.create: DB Error', error);
      return { error: error.message };
    }
    
    console.log('📦 ThingService.create: Success', result.id);
    return { thing: transformDbToApp(result) };
    
  } catch (e) {
    console.error('📦 ThingService.create: Exception', e);
    return { error: 'Unexpected error occurred' };
  }
}

// ✅ ALWAYS: Handle error in calling code
const result = await thingService.createThing(data);
if (result.error) {
  Alert.alert('Failed', result.error);
  return;
}
// Only proceed on success
```

---

### Rule 4: Schema Evolution Guidelines

| Change Type | Approach |
|-------------|----------|
| Add optional column | Just add it; existing code ignores it |
| Add required column | Add with DEFAULT value first, then migrate data |
| Rename column | Create new, migrate data, update services, drop old |
| Change column type | Create new column, migrate, update services, drop old |
| Add new table | Follow Rule 1 checklist |

**Golden Rule:** The Service layer transforms DB format to App format. UI code never changes when DB schema changes.

---

## 10. Quick Start Guide

### Prerequisites

- Node.js 18+
- npm or yarn
- Xcode (for iOS) / Android Studio (for Android)
- Supabase account

### 1. Clone & Install

```bash
git clone <repo-url>
cd E_Commerce

# Install mobile app dependencies
npm install

# Install admin dashboard dependencies
cd admin-dashboard
npm install
cd ..
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings → API
3. Update `src/config/supabase.ts`:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Run Database Migrations

In Supabase Dashboard → SQL Editor, run in order:
```
supabase/001_products_table.sql
supabase/002_storage_bucket.sql
supabase/003_product_attributes.sql
supabase/004_product_images.sql
supabase/005_order_system.sql
```

Or use Supabase CLI:
```bash
npx supabase db push
```

### 4. Start Development

**Mobile App (iOS):**
```bash
npx react-native run-ios
```

**Mobile App (Android):**
```bash
npx react-native run-android
```

**Admin Dashboard:**
```bash
cd admin-dashboard
npm run dev
```

### 5. Seed Sample Data (Optional)

```bash
# In Supabase SQL Editor
-- Run supabase/seed.sql for sample products
```

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| `SYSTEM_ARCHITECTURE.md` | Detailed technical architecture |
| `DATABASE_SETUP.md` | Complete database setup guide |
| `PHASE1_PRODUCT_SYSTEM.md` | Product system specifications |
| `admin-dashboard/README.md` | Admin dashboard documentation |

---

## 🔐 Security Checklist

- [x] RLS enabled on all tables
- [x] `auth.uid()` checks in all policies
- [x] No direct table access without policy
- [x] Sensitive data not exposed in storage URLs
- [x] API keys stored in environment variables (production)

---

## 📞 Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Not authenticated" | Check Supabase config, verify user session |
| Orders not showing | Pull to refresh, check if Supabase is configured |
| Address not saving | Check RLS policies, verify column names |
| Schema mismatch errors | Compare service columns with Supabase Dashboard |

### Debug Mode

Enable verbose logging by checking service console outputs:
```
📦 OrderService: Starting order creation...
📦 OrderService: User ID: abc123...
📦 OrderService: Order created successfully! ID: xyz...
```

---

**Document Version:** 2.0.0  
**Last Updated:** February 7, 2026  
**Authors:** Engineering Team
