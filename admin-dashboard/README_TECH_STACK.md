# 📋 Technical Stack Summary — Admin Dashboard

> **Audit Date:** 2026-02-11
> **Audited By:** Senior Lead Developer (Technical Audit)
> **Scope:** `package.json`, `src/` directory

---

## 🛠 Tech Stack Overview

| Category           | Technology                          | Version    | Notes                                                    |
| ------------------ | ----------------------------------- | ---------- | -------------------------------------------------------- |
| **Framework**      | **Vite** + React + TypeScript       | Vite 5.x, React 18.x, TS 5.x | Module-based (`"type": "module"`), fast HMR dev server  |
| **Styling**        | **Vanilla CSS** + Inline Styles     | —          | Single global stylesheet (`global.css`) + `React.CSSProperties` objects in components |
| **State**          | **React Built-in** (`useState` / `useEffect`) | —  | No external state library (no Redux, Zustand, MobX, or Context API patterns) |
| **Data Fetching**  | **Supabase JS Client** (direct queries) | ^2.39.0 | Service-layer abstraction in `src/lib/supabase.ts`; no Axios, React Query, or SWR |
| **Auth**           | **Supabase Auth**                   | (bundled)  | Email/password sign-in, admin role check via `is_admin` flag, `ProtectedRoute` guard |
| **Navigation**     | **React Router DOM v6**             | ^6.21.0    | `BrowserRouter`, nested `<Routes>`, `<Outlet>` layout pattern |
| **Icons**          | **Custom SVG Components**           | —          | Hand-rolled in `src/components/Icons.tsx` (~30 icons); no third-party icon library |
| **Charts**         | **Recharts**                        | ^2.10.0    | `AreaChart`, `BarChart`, `PieChart` used on the Dashboard |
| **Date Utilities** | **date-fns**                        | ^3.0.0     | Date formatting and manipulation                         |
| **Forms**          | **Native HTML Forms** + React State | —          | Standard `<form onSubmit>` with `useState`; no React Hook Form or Formik |

---

## 📦 Dependency Breakdown

### Production Dependencies (6)
```
@supabase/supabase-js  ^2.39.0   ← Backend-as-a-Service (DB, Auth, Storage)
react                  ^18.2.0   ← UI library
react-dom              ^18.2.0   ← React DOM renderer
react-router-dom       ^6.21.0   ← Client-side routing
recharts               ^2.10.0   ← Charting library
date-fns               ^3.0.0    ← Date utility library
```

### Dev Dependencies (4)
```
@types/react           ^18.2.45  ← React type definitions
@types/react-dom       ^18.2.18  ← ReactDOM type definitions
@vitejs/plugin-react   ^4.2.1    ← Vite React plugin (JSX transform, HMR)
typescript             ^5.3.3    ← TypeScript compiler
vite                   ^5.0.10   ← Build tool & dev server
```

---

## 📂 Key File Structure

```
admin-dashboard/
├── index.html                  # Vite entry HTML
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── package.json                # 6 prod + 4 dev dependencies
│
└── src/
    ├── main.tsx                # App bootstrap & ReactDOM.createRoot
    ├── App.tsx                 # Root component — BrowserRouter + Route definitions
    ├── vite-env.d.ts           # Vite type declarations
    │
    ├── components/
    │   ├── Layout.tsx          # Sidebar + Outlet shell (shared layout)
    │   ├── ProtectedRoute.tsx  # Auth guard — checks session + admin role
    │   └── Icons.tsx           # ~30 custom inline SVG icon components
    │
    ├── lib/
    │   └── supabase.ts         # Supabase client, TypeScript types, service functions
    │                           #   → productService, orderService, storageService, etc.
    │
    ├── pages/
    │   ├── Login.tsx           # Admin login (public route)
    │   ├── Dashboard.tsx       # Stats overview + Recharts visualizations
    │   ├── Products.tsx        # CRUD for products (largest page ~1265 lines)
    │   ├── Orders.tsx          # Order management & status updates
    │   ├── Users.tsx           # Customer list (excludes sellers)
    │   ├── Inventory.tsx       # Stock management
    │   ├── Categories.tsx      # Category management
    │   └── Sellers.tsx         # Seller management & verification
    │
    └── styles/
        └── global.css          # Single global stylesheet (~23 KB)
```

---

## 🔑 Architecture Notes

| Aspect                  | Detail                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Routing Pattern**     | Flat, single-level routes nested under a shared `<Layout>` with a `<ProtectedRoute>` wrapper |
| **Auth Flow**           | `ProtectedRoute` checks `supabase.auth.getSession()` → verifies `is_admin` via RPC/query → renders `<Outlet>` or redirects to `/login` |
| **Data Layer**          | All Supabase calls are centralized in `src/lib/supabase.ts` as typed service objects (`productService.getAll()`, etc.) |
| **Component Strategy**  | Page-level components with co-located inline styles; minimal shared component extraction |
| **No External UI Kit**  | Zero dependency on MUI, Ant Design, Chakra, or Tailwind — fully custom CSS              |
| **No Global State Mgr** | Each page manages its own state via `useState`; no cross-page shared state              |
| **Build Pipeline**      | `tsc && vite build` — TypeScript type-check first, then Vite production build           |

---

## ⚠️ Observations & Recommendations

1. **Large Page Files** — `Products.tsx` is **~1,265 lines**. Consider splitting into sub-components (form modal, product table, filters).
2. **No Form Validation Library** — Forms use manual state. For complex forms, consider **React Hook Form** + **Zod** for schema validation.
3. **No Data Caching Layer** — Every page re-fetches on mount. **TanStack Query** would add caching, background refetch, and loading states.
4. **No Error Boundary** — No `ErrorBoundary` component detected. A global error boundary would improve resilience.
5. **Single CSS File** — `global.css` at ~23 KB could benefit from CSS Modules or a scoped solution as the app grows.
6. **No Testing** — No test dependencies (`jest`, `vitest`, `@testing-library`) detected. Consider adding unit/integration tests.
