# E-Commerce Admin Dashboard

A modern, responsive admin dashboard for managing your e-commerce store. Built with React, TypeScript, and Supabase.

## Features

- 📊 **Dashboard Overview** - Key metrics, charts, and quick stats at a glance
- 📦 **Products Management** - Add, edit, delete, and manage product catalog
- 🛒 **Orders Management** - Track orders, update status, view order details
- 👥 **Users Management** - View customer profiles, order history, account status
- 📋 **Inventory Tracking** - Monitor stock levels, low stock alerts, update quantities
- 🏷️ **Categories** - Organize products with hierarchical categories
- 🏪 **Sellers** - Manage marketplace sellers and verification

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **React Router** - Navigation
- **Recharts** - Data Visualization
- **Supabase** - Backend & Database

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase project with the e-commerce schema

### Installation

1. Navigate to the admin dashboard directory:
   ```bash
   cd admin-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Add your Supabase credentials to `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3001](http://localhost:3001) in your browser

## Project Structure

```
admin-dashboard/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── Layout.tsx     # Main layout with sidebar
│   ├── lib/
│   │   └── supabase.ts    # Supabase client & types
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx  # Overview & stats
│   │   ├── Products.tsx   # Products management
│   │   ├── Orders.tsx     # Orders management
│   │   ├── Users.tsx      # User management
│   │   ├── Inventory.tsx  # Stock management
│   │   ├── Categories.tsx # Category management
│   │   └── Sellers.tsx    # Seller management
│   ├── styles/
│   │   └── global.css     # Global styles
│   ├── App.tsx            # App routes
│   └── main.tsx           # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Screenshots

### Dashboard
View key metrics, sales charts, order status distribution, and recent orders.

### Products
Full CRUD operations for products with search, filter by category, and status toggle.

### Orders
Manage orders with status updates, payment tracking, and detailed order views.

### Inventory
Monitor stock levels with visual indicators for low stock and out-of-stock items.

## Security Notes

- This dashboard uses the Supabase anon key. For production, implement proper authentication
- Consider adding Row Level Security (RLS) policies for admin-only access
- Use Supabase service role key for server-side operations only

## Customization

### Theming
Edit `src/styles/global.css` to customize:
- Colors (CSS variables at the top)
- Typography
- Spacing
- Component styles

### Adding New Pages
1. Create a new page in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/Layout.tsx`

## License

MIT
