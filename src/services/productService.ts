/**
 * Product Service - Phase 1 (Clean Implementation)
 * 
 * This service fetches products from Supabase.
 * It ONLY reads from the 'products' table where is_active = true.
 * 
 * NO complex views, NO variants, NO inventory joins.
 * Just simple products for display.
 */

import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { Product } from '../types';

// =====================================================
// DATABASE PRODUCT TYPE
// =====================================================
// This matches the products table in Supabase exactly

// Size type enum
type DBSizeType = 'clothing' | 'shoe' | 'quantity' | 'none' | null;

// Color object from database
interface DBProductColor {
  name: string;
  hex: string;
}

// Product attributes key-value structure from database
interface DBProductAttributes {
  [key: string]: string;
}

interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  mrp: number | null;              // Maximum Retail Price (original price)
  discount_percent: number | null; // Discount percentage (0-100)
  category: string | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  // New attribute fields
  brand_name: string | null;
  size_type: DBSizeType;
  sizes: string[] | null;            // e.g., ["S", "M", "L"] or ["6", "7", "8"]
  colors: DBProductColor[] | null;   // e.g., [{"name": "Black", "hex": "#000000"}]
  default_color: string | null;
  // Multiple images support
  images: string[] | null;           // e.g., ["url1", "url2", "url3"]
  // Structured product information (Phase 1 - Step 1)
  highlights: string[] | null;       // ["100% Cotton", "Machine washable", ...]
  attributes: DBProductAttributes | null;  // {"Material": "Cotton", "Fit": "Regular", ...}
  seller_name: string | null;        // Seller/store name (legacy field)
  // Seller assignment (Phase 2 - Marketplace)
  seller_id: string | null;          // Links to sellers.id
  seller_store_name: string | null;  // From products_with_seller view
  seller_is_verified: boolean | null; // From products_with_seller view
}

// =====================================================
// TRANSFORM FUNCTIONS
// =====================================================

/**
 * Convert a database product to the app's Product type.
 * This provides sensible defaults for optional fields.
 * 
 * KEY BEHAVIOR for backward compatibility:
 * - If sizes array is empty/null AND size_type is 'none':
 *     → Return empty sizes array (UI will hide size selector)
 * - If colors array is empty/null:
 *     → Return empty colors array (UI will hide color selector)
 * - If brand_name is empty/null:
 *     → Use 'Store Brand' as default
 * - If images array is empty/null:
 *     → Fallback to image_url (single image)
 */
function dbProductToAppProduct(dbProduct: DBProduct): Product {
  // Transform sizes: only include if size_type is not 'none' and sizes exist
  const hasSizes = dbProduct.size_type !== 'none' &&
    dbProduct.sizes &&
    dbProduct.sizes.length > 0;

  const sizes = hasSizes
    ? dbProduct.sizes!.map(label => ({ label, available: true }))
    : []; // Empty array = UI will hide size section

  // Transform colors: only include if colors array has items
  const hasColors = dbProduct.colors && dbProduct.colors.length > 0;

  const colors = hasColors
    ? dbProduct.colors!.map(color => ({
      name: color.name,
      hex: color.hex,
      available: true
    }))
    : []; // Empty array = UI will hide color section (or show if just 1)

  // Transform images: prefer images array, fallback to image_url
  let productImages: string[] = [];
  if (dbProduct.images && dbProduct.images.length > 0) {
    productImages = dbProduct.images;
  } else if (dbProduct.image_url) {
    productImages = [dbProduct.image_url];
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    brand: dbProduct.brand_name || 'Store Brand', // Use actual brand or fallback
    price: dbProduct.price,
    // Use MRP from database if available, otherwise use price (no discount case)
    originalPrice: dbProduct.mrp || dbProduct.price,
    // Use discount_percent from database if available
    discount: dbProduct.discount_percent || 0,
    rating: 4.0, // Default rating
    ratingCount: 0,
    images: productImages,
    sizes: sizes,
    colors: colors,
    description: dbProduct.description || '',
    categoryId: dbProduct.category || '',
    subcategoryId: '',
    tags: dbProduct.category ? [dbProduct.category] : [],
    inStock: dbProduct.stock > 0,
    deliveryDays: 5,
    // Structured product information (Phase 1 - Step 1)
    // Only include if they exist (undefined if null/empty for cleaner data)
    highlights: dbProduct.highlights && dbProduct.highlights.length > 0
      ? dbProduct.highlights
      : undefined,
    attributes: dbProduct.attributes && Object.keys(dbProduct.attributes).length > 0
      ? dbProduct.attributes
      : undefined,
    // Seller name: prefer seller_store_name from view, fallback to seller_name field
    sellerName: dbProduct.seller_store_name || dbProduct.seller_name || undefined,
  };
}

// =====================================================
// SERVICE STATE
// =====================================================

export interface ProductsResult {
  products: Product[];
  error?: string;
}

export interface ProductResult {
  product?: Product;
  error?: string;
}

// =====================================================
// PRODUCT SERVICE
// =====================================================

export const productService = {
  /**
   * Fetch all active products from Supabase.
   * Uses the products_with_seller view to include seller info.
   * Only returns products where is_active = true.
   */
  async getProducts(): Promise<ProductsResult> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase not configured - returning empty products');
      return { products: [], error: 'Supabase not configured' };
    }

    try {
      // Use products_with_seller view which includes seller info
      const { data, error } = await getSupabase()
        .from('products_with_seller')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error.message);
        // Fallback to products table if view doesn't exist
        const fallback = await getSupabase()
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (fallback.error) {
          return { products: [], error: fallback.error.message };
        }
        return { products: (fallback.data || []).map(dbProductToAppProduct) };
      }

      const products = (data || []).map(dbProductToAppProduct);
      console.log(`✅ Fetched ${products.length} products from Supabase`);
      return { products };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to fetch products:', message);
      return { products: [], error: message };
    }
  },

  /**
   * Fetch a single product by ID.
   */
  async getProductById(productId: string): Promise<ProductResult> {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await getSupabase()
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { product: dbProductToAppProduct(data) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: message };
    }
  },

  /**
   * Fetch products by category.
   */
  async getProductsByCategory(category: string): Promise<ProductsResult> {
    if (!isSupabaseConfigured()) {
      return { products: [], error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await getSupabase()
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        return { products: [], error: error.message };
      }

      return { products: (data || []).map(dbProductToAppProduct) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { products: [], error: message };
    }
  },

  /**
   * Search products by name.
   */
  async searchProducts(query: string): Promise<ProductsResult> {
    if (!isSupabaseConfigured()) {
      return { products: [], error: 'Supabase not configured' };
    }

    if (!query.trim()) {
      return this.getProducts();
    }

    try {
      const { data, error } = await getSupabase()
        .from('products')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return { products: [], error: error.message };
      }

      return { products: (data || []).map(dbProductToAppProduct) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { products: [], error: message };
    }
  },
};

// =====================================================
// HOOKS (for use in components)
// =====================================================

import { useState, useEffect, useCallback } from 'react';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await productService.getProducts();

    setProducts(result.products);
    setError(result.error || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}

export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);

      const result = await productService.getProductById(productId);

      setProduct(result.product || null);
      setError(result.error || null);
      setLoading(false);
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  return { product, loading, error };
}

export function useProductsByCategory(category: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);

      const result = await productService.getProductsByCategory(category);

      setProducts(result.products);
      setError(result.error || null);
      setLoading(false);
    }

    if (category) {
      fetch();
    }
  }, [category]);

  return { products, loading, error };
}
