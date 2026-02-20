# 🛠 Tech Stack Overview

| Layer          | Technology                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| **Core**       | React Native `0.83.1` (Bare / CLI — **not** Expo)                         |
| **Language**   | TypeScript `5.x`                                                           |
| **Styling**    | React Native `StyleSheet` (no external UI library — fully custom components) |
| **State**      | Zustand `5.x` (stores: `bagStore`, `wishlistStore`, `userStore`, `filterStore`) |
| **Data**       | Supabase JS Client `2.x` — direct DB queries via `supabase-js` (no React Query / SWR) |
| **Auth**       | Supabase Auth (session persisted with `@react-native-async-storage/async-storage`) |
| **Navigation** | React Navigation `7.x` (`@react-navigation/native-stack` + `@react-navigation/bottom-tabs`) |
| **Icons**      | `react-native-vector-icons` `10.x`                                        |
| **Forms**      | Manual / controlled components (no React Hook Form / Formik)               |
| **Animations** | `react-native-reanimated` `4.x` + `react-native-worklets`                 |
| **Lists**      | `@shopify/flash-list` `2.x`                                               |
| **Images**     | `react-native-image-picker` `8.x` (camera & gallery)                      |

---

## 📂 Key File Structure

```
src/
├── app/                    # App bootstrap (AppRoot.tsx)
├── components/
│   ├── common/             # Shared reusable UI (buttons, cards, loaders…)
│   └── product/            # Product-specific components
├── config/
│   └── supabase.ts         # Supabase client init & helpers
├── mocks/                  # Mock data for offline / dev mode
├── navigation/
│   └── RootNavigator.tsx   # Full nav tree (Auth → Tabs → Stacks)
├── screens/
│   ├── auth/               # LoginScreen, SignupScreen
│   ├── home/               # HomeScreen
│   ├── categories/         # CategoriesScreen, CategoryLandingScreen
│   ├── search/             # SearchScreen
│   ├── product/            # ProductListScreen, ProductDetailsScreen
│   ├── wishlist/           # WishlistScreen
│   ├── bag/                # BagScreen
│   ├── checkout/           # CheckoutScreen
│   ├── orders/             # OrdersScreen, OrderDetailsScreen, OrderSuccessScreen, WriteReviewScreen
│   └── profile/            # ProfileScreen, EditProfileScreen, SettingsScreen, CouponsScreen, AddressesScreen, AddAddressScreen
├── services/               # All Supabase data-access logic
│   ├── authService.ts
│   ├── productService.ts
│   ├── cartService.ts
│   ├── orderService.ts
│   ├── wishlistService.ts
│   ├── categoryService.ts
│   ├── couponService.ts
│   ├── addressService.ts
│   ├── reviewService.ts
│   ├── ratingService.ts
│   ├── returnReplaceService.ts
│   └── sellerService.ts
├── store/                  # Zustand global stores
│   ├── bagStore.ts
│   ├── wishlistStore.ts
│   ├── userStore.ts
│   └── filterStore.ts
├── theme/                  # Design tokens
│   ├── colors.ts
│   ├── spacing.ts
│   └── typography.ts
└── types/
    └── database.ts         # Supabase DB type definitions
```

---

## 🗺 Navigation Architecture

```
RootNavigator
 ├── Auth Stack (unauthenticated)
 │    ├── LoginScreen
 │    └── SignupScreen
 │
 └── Main Tabs (authenticated)
      ├── 🏠 Home Tab (HomeStack)
      │    ├── HomeScreen
      │    ├── ProductListScreen
      │    └── ProductDetailsScreen
      ├── 📂 Categories Tab (CategoriesStack)
      │    ├── CategoriesScreen
      │    └── CategoryLandingScreen
      ├── 🔍 Search Tab
      ├── ❤️ Wishlist Tab
      └── 👤 Profile Tab (ProfileStack)
           ├── ProfileScreen
           ├── EditProfileScreen
           ├── SettingsScreen
           ├── CouponsScreen
           ├── AddressesScreen / AddAddressScreen
           ├── BagScreen → CheckoutScreen → OrderSuccessScreen
           ├── OrdersScreen → OrderDetailsScreen
           └── WriteReviewScreen
```

---

## 🔑 Backend — Supabase

| Capability       | How it's used                                        |
| ---------------- | ---------------------------------------------------- |
| **Database**     | PostgreSQL via `supabase-js` direct queries           |
| **Auth**         | Email/Password sign-up & sign-in, session auto-refresh |
| **Storage**      | Profile photos & review image uploads                 |
| **RLS**          | Row Level Security policies enforcing role-based access (Admin / Seller / User) |
| **Realtime**     | Configured (events per second: 10)                    |

---

> **Generated:** 2026-02-11 · **Audited by:** AI Technical Audit
