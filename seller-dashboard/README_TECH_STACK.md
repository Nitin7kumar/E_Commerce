# 🛠 Tech Stack Overview

| Category       | Technology                                           | Version   |
| -------------- | ---------------------------------------------------- | --------- |
| **Core**       | React + TypeScript (Vite)                            | React 18, Vite 5, TS 5 |
| **Styling**    | Vanilla CSS (single `index.css`, no UI library)      | —         |
| **State**      | React built-in (`useState` / `useEffect`)            | —         |
| **Data**       | Supabase JS Client (direct queries, no React Query)  | ^2.39.0   |
| **Auth**       | Supabase Auth (`signInWithPassword` / `getUser`)     | ^2.39.0   |
| **Navigation** | React Router DOM (v6, `BrowserRouter` + `Routes`)    | ^6.21.0   |
| **Icons**      | Custom inline SVG components (`src/components/Icons.tsx`) | —     |
| **Forms**      | Native HTML `<form>` + controlled inputs (`useState`) | —        |

---

## 📋 Detailed Breakdown

### 1. Framework — **Vite + React 18 + TypeScript**
- Build tool: **Vite 5** (`@vitejs/plugin-react ^4.2.1`)
- Dev server runs on port **5174** (`vite --port 5174`)
- Build command: `tsc && vite build` (type-checking then bundle)
- ESM modules (`"type": "module"` in `package.json`)

### 2. UI / Styling — **Vanilla CSS**
- All styles live in a single file: `src/index.css` (16.6 KB)
- No component library (no MUI, Ant Design, Chakra, Tailwind, etc.)
- Custom design tokens and utility classes defined manually

### 3. State Management — **React Built-in**
- No external state library (no Redux, Zustand, MobX, Jotai, etc.)
- All state is managed via `useState` / `useEffect` hooks
- Auth state (current seller) is lifted to `App.tsx` and passed via props

### 4. Data Fetching — **Supabase JS Client (Direct)**
- Uses `@supabase/supabase-js` for all database operations
- No caching / query layer (no React Query, SWR, RTK Query)
- CRUD helpers exported from `src/lib/supabase.ts`:
  - `getMyProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`
- File uploads go directly to Supabase Storage via the client

### 5. Authentication — **Supabase Auth**
- Email + Password sign-in (`signInWithPassword`)
- Session persistence handled by the Supabase client
- Seller-role verification: after auth, the app checks the `sellers` table to confirm the user is an active seller

### 6. Navigation — **React Router DOM v6**
- `BrowserRouter` + `Routes` + `Route`
- Protected routes: if no seller session → redirect to `/login`
- Sidebar layout defined inline in `App.tsx` using a `<Layout>` component

### 7. Icons — **Custom SVG Components**
- 17 hand-rolled SVG icon components in `src/components/Icons.tsx`
- No icon library dependency (no Lucide, Heroicons, FontAwesome, etc.)
- Exported as a single `Icons` object + a reusable `<Icon>` wrapper

### 8. Forms — **Native / Controlled**
- Standard `<form onSubmit={…}>` with `e.preventDefault()`
- All form fields are controlled via `useState`
- No form library (no React Hook Form, Formik, etc.)

---

## 📂 Key File Structure

```
seller-dashboard/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                  # Entry point, mounts <App />
    ├── App.tsx                   # Router, auth gate, sidebar Layout
    ├── index.css                 # All application styles (single file)
    ├── vite-env.d.ts             # Vite type declarations
    ├── components/
    │   └── Icons.tsx             # 17 custom SVG icon components
    ├── lib/
    │   └── supabase.ts           # Supabase client, types, auth & CRUD helpers
    └── pages/
        ├── Login.tsx             # Seller login screen
        ├── Dashboard.tsx         # Overview stats & quick actions
        └── Products.tsx          # Full product CRUD (list, create, edit, delete)
```

### Route Map

| Path         | Component      | Auth Required | Description                        |
| ------------ | -------------- | ------------- | ---------------------------------- |
| `/login`     | `Login.tsx`    | No            | Seller email/password sign-in      |
| `/`          | `Dashboard.tsx`| Yes           | Store overview & quick actions     |
| `/products`  | `Products.tsx` | Yes           | Product management (CRUD + images) |

---

## 📦 Dependency Audit

### Production Dependencies (3)
| Package                | Purpose              |
| ---------------------- | -------------------- |
| `react` ^18.2.0       | UI framework         |
| `react-dom` ^18.2.0   | DOM renderer         |
| `react-router-dom` ^6.21.0 | Client-side routing |
| `@supabase/supabase-js` ^2.39.0 | Backend-as-a-Service |

### Dev Dependencies (4)
| Package                       | Purpose              |
| ----------------------------- | -------------------- |
| `vite` ^5.0.8                 | Build tool / dev server |
| `@vitejs/plugin-react` ^4.2.1 | React fast-refresh    |
| `typescript` ^5.2.2           | Type checking        |
| `@types/react` ^18.2.43      | React type definitions |
| `@types/react-dom` ^18.2.17  | ReactDOM type definitions |

---

> **Summary:** This is a lean, zero-bloat seller dashboard. It relies on **4 production dependencies** with no external UI library, state manager, form library, or data-fetching layer — everything is built with React primitives and Supabase direct calls.
