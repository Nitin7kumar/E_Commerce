# E-Commerce System Architecture Reference

**Version:** 1.0.0
**Last Updated:** February 2026
**Status:** Production-Ready Blueprint

---

## 📚 Table of Contents
1. [High-Level Architecture Overview](#1-high-level-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Application Flow Diagrams](#3-application-flow-diagrams)
4. [Database Schema & Relationships](#4-database-schema--relationships)
5. [Component-Level Architecture](#5-component-level-architecture)
6. [Admin vs User Separation](#6-admin-vs-user-separation)
7. [Security Model](#7-security-model)
8. [Error Handling Philosophy](#8-error-handling-philosophy)
9. [Incremental Development Strategy](#9-incremental-development-strategy)
10. [Scalability & Future Enhancements](#10-scalability--future-enhancements)

---

## 1. High-Level Architecture Overview

The system follows a modern **Serverless/PaaS** architecture using the JAMstack principles. It separates the consumer-facing mobile experience from the operations-facing web dashboard, both unified by a single, powerful backend.

### **1. User Mobile App**
- **Platform:** React Native (iOS & Android).
- **Purpose:** Primary storefront for end-users to browse, search, and purchase products.
- **Key Features:** Fast browsing, local cart management, secure checkout, real-time order tracking.

### **2. Admin Dashboard**
- **Platform:** Web (React/Vite).
- **Purpose:** Operations hub for platform admins and independent sellers.
- **Key Features:** Product management, order fulfillment, inventory tracking, analytics.

### **3. Supabase Backend**
- **Platform:** Supabase (BaaS).
- **Purpose:** The "brain" of the operation.
- **Responsibilities:**
  - **Auth:** Handles identity (Email/Password, Social) for both Users and Sellers.
  - **Database:** PostgreSQL for strong consistency and relational data.
  - **Storage:** Blob storage for product images and user avatars.
  - **Realtime:** Subscriptions for live updates (e.g., status changes).

---

## 2. Tech Stack

### **Frontend Support**
| Component | Technology | Reason for Choice |
|-----------|------------|-------------------|
| **Mobile App** | **React Native** | Cross-platform (iOS/Android) with native performance. |
| **Web Admin** | **Vite + React** | Extremely fast build times and modern DX. |
| **State Mgmt** | **Zustand** | Minimalist, boileplate-free global state management. |
| **Styling** | **StyleSheet / CSS**| Native performance (Mobile) / Flexibility (Web). |

### **Backend Infrastructure**
| Component | Technology | Reason for Choice |
|-----------|------------|-------------------|
| **Core** | **Supabase** | Open-source Firebase alternative with full SQL power. |
| **Database** | **PostgreSQL** | Industry standard for relational e-commerce data. |
| **Auth** | **Supabase Auth** | Built-in JWT handling and RLS integration. |
| **Storage** | **Supabase Storage** | Integrated file hosting with policy-based access. |

---

## 3. Application Flow Diagrams

### **A. User Authentication Flow**
Standard secure login flow using Supabase Auth.
```ascii
[Login Screen]
    │
    │ (Input Credentials)
    ▼
[Auth Service] ─── (signInWithPassword) ───▶ [Supabase Auth]
                                                    │
                                            (Validates JWT)
                                                    ▼
[User Store]  ◀─── (Returns Session) ◀────── [Supabase Auth]
    │
    │ (Update State)
    ▼
[Navigation] ───▶ [Home Screen]
```

### **B. Product Browsing Flow**
Efficient data fetching with caching mechanisms.
```ascii
[Home Screen]
    │
    │ (useProducts Hook)
    ▼
[Product Service]
    │
    │ (.from('products').select('*'))
    ▼
[Supabase Client]
    │
    │ (HTTPS Request)
    ▼
[PostgreSQL DB] ───▶ (Filter: is_active=true)
    │
    │ (Return JSON)
    ▼
[Product Service] ───▶ (Normalize Data) ───▶ [UI Rendering]
```

### **C. Address Add & Fetch Flow**
Secure user-specific data handling.
```ascii
[Profile / Checkout]
    │
    │ (Add Address Form)
    ▼
[Address Service]
    │
    │ (Insert with user_id)
    ▼
[Supabase (RLS)] ───▶ Checks: auth.uid() == user_id
    │
    │ (Write Success)
    ▼
[Address Store] ◀─── (Sync State)
```

### **D. Order Placement Flow**
Transactional integrity is critical here.
```ascii
[Checkout Screen]
    │
    │ (Confirm Order)
    ▼
[Order Service]
    │
    │ 1. Create Order Header
    │ 2. Create Order Items
    │ 3. Clear Cart (Client Side)
    ▼
[Supabase Transaction]
    │
    ├── insert(orders)
    ├── insert(order_items)
    └── (Trigger: Update Stock)
    ▼
[Order Confirmation UI]
```

### **E. My Orders Fetch Flow**
Retrieving history with relational joins.
```ascii
[Orders Screen]
    │
    ▼
[Order Service]
    │
    │ (.from('orders').select('*, items(*)'))
    ▼
[Supabase DB]
    │
    ├── Fetch Orders
    └── Join Order Items
    ▼
[User Interface] ───▶ (Group by Date/Status)
```

---

## 4. Database Schema & Relationships

The database is normalized to 3NF standards to ensure data integrity.

### **Core Tables**

#### **1. `profiles`**
- **Purpose:** Extends the basic Supabase `auth.users` table with app-specific data.
- **Key Columns:** `id` (PK, references auth.users), `full_name`, `avatar_url`, `phone`.
- **Relationships:** One-to-One with `auth.users`.

#### **2. `products`**
- **Purpose:** The central catalog of items.
- **Key Columns:** `id`, `name`, `price`, `stock` (or variant logic), `seller_id`, `is_active`.
- **Relationships:** Belongs to `sellers` (FK), Linked to `subcategories`.

#### **3. `addresses`**
- **Purpose:** Stored delivery locations for users.
- **Key Columns:** `id`, `user_id` (FK), `street`, `city`, `zip_code`, `is_default`.
- **Relationships:** Many-to-One with `profiles`.

#### **4. `orders`**
- **Purpose:** Transactional headers.
- **Key Columns:** `id`, `user_id` (FK), `total_amount`, `status` (pending/shipped/etc), `shipping_address_id`.
- **Relationships:** Belongs to `profiles`.

#### **5. `order_items`**
- **Purpose:** Individual items within an order (Snapshot pattern).
- **Key Columns:** `id`, `order_id` (FK), `product_id` (FK), `quantity`, `unit_price`, `seller_id`.
- **Relationships:** Links `orders` to `products`.

### **Extended Features**
- **`sellers`**: Business profiles for multi-vendor support.
- **`inventory`**: Granular stock tracking per variant (size/color).
- **`return_replace_requests`**: Managing post-purchase workflows.
- **`customer_ratings`**: Feedback system linked to products and users.

---

## 5. Component-Level Architecture

We follow a **Separation of Concerns** pattern to keep the UI clean and logic testable.

### **The Pipeline**
`Screen` → `Hook` → `Service` → `Supabase`

### **Role Definitions**
1.  **Screens (`src/screens`)**:
    - Dumb containers that handle layout and user interaction.
    - **Do not** contain business logic or direct API calls.
    - Example: `HomeScreen.tsx` just renders a list of `ProductCard` components.

2.  **Hooks (`src/services/hooks`)**:
    - Connects screens to services.
    - Manages local loading/error states.
    - Example: `useProducts()` sets `loading=true`, calls service, then updates state.

3.  **Services (`src/services`)**:
    - The "Brains". Pure TypeScript functions.
    - Handle data transformation (e.g., `dbProductToAppProduct`).
    - Handle error logging.
    - Execute the actual Supabase SDK calls.
    - Example: `productService.getProducts()`.

4.  **State Management (Zustand Stores)**:
    - Global state that needs to persist across screens (Cart, Auth User).
    - Example: `bagStore.ts` holds the current cart items.

---

## 6. Admin vs User Separation

The system is designed to support two distinct user personas sharing the same database but different interfaces.

### **User App (React Native)**
- **Focus:** Consumption.
- **Capabilities:**
  - View products (Read-only on catalog).
  - Manage own cart/orders (Read/Write own data).
  - Edit own profile.
- **Data Access:** Restricted strictly to "Standard User" RLS policies.

### **Admin Dashboard (Web)**
- **Focus:** Management.
- **Capabilities:**
  - **Super Admin:** Manage sellers, categories, platform settings.
  - **Seller:** Create products, update inventory, process orders.
- **Data Access:** Access to aggregated data (orders, revenue) relevant to their seller ID.

---

## 7. Security Model

Security is enforced at the database layer, not just the client side.

### **Row Level Security (RLS)**
We use PostgreSQL RLS to create a "Zero Trust" environment. Even if a malicious user bypasses the UI, the DB rejects unauthorized queries.

- **`products`**: Public Read, Seller Write (own products only).
- **`orders`**: User Read/Write (own only), Seller Read (orders containing their items).
- **`profiles`**: User Read/Update (own only).

### **Authentication**
- **Supabase Auth** manages JWT tokens.
- Every API request carries the user's Token.
- `auth.uid()` is used in SQL policies to match ownership.

---

## 8. Error Handling Philosophy

Our application follows strict rules to prevent data inconsistency:

1.  **Database First**: The UI never assumes success. It waits for the DB to confirm a write before showing "Success".
    - *Exception:* Optimistic updates for low-risk actions like "Like" buttons.
2.  **No Silent Failures**: All Supabase errors are caught in the Service layer, logged to the console, and returned as readable error messages to the Hook layer.
3.  **Transactional Integrity**: Critical flows (Place Order) use SQL transactions or careful ordering to prevent partial state (e.g., Order created, but Items failed).

---

## 9. Incremental Development Strategy

We do not build the "Perfect System" on Day 1. We evolve it.

1.  **Phase 1 (MVP)**: Flat product table, simple orders, no variants. Focus on UI flow.
2.  **Phase 2**: Introduce `product_variants` and `inventory`. The Service layer adapts (`dbProductToAppProduct`) to map the new schema to the existing UI types, ensuring the App doesn't crash.
3.  **Phase 3**: Multi-vendor headers. Add `seller_id` to tables. Update RLS policies.

**Backward Compatibility:**
The data transformation layer in `services` ensures that as the DB schema becomes complex, the Frontend components receive a consistent data shape.

---

## 10. Scalability & Future Enhancements

The architecture is designed to scale:

1.  **Inventory & Variants**: The schema already supports `size` and `color` variants. Future updates will move from simple `stock` columns to a dedicated `inventory` ledger table.
2.  **Payments**: The order flow is ready for Payment Gateway integration. The `orders` table has status fields (`pending_payment`, `paid`) ready to be hooked into Stripe/Razorpay webhooks.
3.  **Order Tracking**: The implementation of `order_item_timeline` allows for granular status updates (e.g., "Item A shipped", "Item B processing") which is crucial for multi-vendor orders.
