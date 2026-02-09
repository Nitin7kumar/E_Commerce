import { createClient } from '@supabase/supabase-js';

// Supabase credentials
// In production, use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xskeecvleyzwlgpxfrsb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza2VlY3ZsZXl6d2xncHhmcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjA4MTEsImV4cCI6MjA4NTU5NjgxMX0.vnd2tFx5hvMG2iMZpYqMUV3YLMSnTPpCG5f-w5pxuno';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// ORDER TYPES (matches actual database schema)
// =====================================================

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  address_id: string | null;
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  delivery_charge: number;
  total_amount: number;
  estimated_delivery: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_brand: string | null;
  product_image: string | null;
  size_label: string | null;
  color_name: string | null;
  color_hex: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  created_at: string;
}

// =====================================================
// USER/PROFILE TYPE
// =====================================================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// PHASE 1: SIMPLE PRODUCT TYPE
// =====================================================
// This matches our new products table exactly
// No variants, no complex inventory - just simple products

// Size type options for products
export type SizeType = 'clothing' | 'shoe' | 'quantity' | 'none';

// Color object structure
export interface ProductColor {
  name: string;
  hex: string;
}

// Product attributes key-value structure
export interface ProductAttributes {
  [key: string]: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
  // New attribute fields
  brand_name: string | null;
  size_type: SizeType | null;
  sizes: string[] | null;           // e.g., ["S", "M", "L"] or ["6", "7", "8"]
  colors: ProductColor[] | null;    // e.g., [{"name": "Black", "hex": "#000000"}]
  default_color: string | null;
  // Multiple images support
  images: string[] | null;          // e.g., ["url1", "url2", "url3"] - first is primary
  // Structured product information (Phase 1 - Step 1)
  highlights: string[] | null;      // ["100% Cotton", "Machine washable", ...]
  attributes: ProductAttributes | null;  // {"Material": "Cotton", "Fit": "Regular", ...}
  seller_name: string | null;       // Seller/brand name for product details
  // Seller assignment (Phase 2 - Marketplace)
  seller_id: string | null;         // Links to sellers.id
}

// Form data for creating/updating products
export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  stock: string;
  is_active: boolean;
  // New attribute fields
  brand_name: string;
  size_type: SizeType;
  sizes: string[];
  colors: ProductColor[];
  default_color: string;
  // Multiple images support
  images: string[];                  // Array of image URLs
  // Structured product information (Phase 1 - Step 1)
  highlights: string[];              // Array of highlight strings
  attributes: { key: string; value: string }[];  // Array of {key, value} for form editing
  seller_name: string;               // Seller/brand name
}

// =====================================================
// AUTH HELPERS
// =====================================================

export interface AdminUser {
  id: string;
  email: string;
  is_admin: boolean;
}

// Check if current user is an admin
export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check user_metadata for is_admin flag
  return user.user_metadata?.is_admin === true;
}

// Get current user with admin status
export async function getCurrentUser(): Promise<AdminUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    is_admin: user.user_metadata?.is_admin === true,
  };
}

// Sign in with email/password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // Check if user is admin
  const isAdmin = data.user?.user_metadata?.is_admin === true;
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error('Access denied. Admin privileges required.');
  }

  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// =====================================================
// PRODUCT SERVICE
// =====================================================

export const productService = {
  // Fetch all products (admin sees all, including inactive)
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create a new product
  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a product
  async update(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a product
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle active status
  async toggleActive(id: string, currentStatus: boolean): Promise<Product> {
    return this.update(id, { is_active: !currentStatus });
  },
};

// =====================================================
// IMAGE UPLOAD
// =====================================================

export const storageService = {
  // Upload product image
  async uploadProductImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error } = await supabase.storage
      .from('product_image')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data } = supabase.storage
      .from('product_image')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Delete product image
  async deleteProductImage(url: string): Promise<void> {
    // Extract file path from URL
    const path = url.split('/product_image/')[1];
    if (!path) return;

    const { error } = await supabase.storage
      .from('product_image')
      .remove([path]);

    if (error) throw error;
  },
}

// =====================================================
// SELLER TYPES (Phase 2 - Marketplace)
// =====================================================

// Seller interface - matches 007_seller_system.sql exactly
export interface Seller {
  id: string;
  user_id: string;                      // Links to auth.users
  store_name: string;
  store_description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_address: string | null;
  is_active: boolean;                   // Only admin can modify
  is_verified: boolean;                 // For "Verified Seller" badge
  created_at: string;
  updated_at: string;
}

export interface SellerFormData {
  user_email: string;        // Email to create/link auth user
  user_password?: string;    // Password for new user (create only)
  store_name: string;
  store_description: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  is_active: boolean;
  is_verified: boolean;
}

// =====================================================
// SELLER SERVICE
// =====================================================

export const sellerService = {
  // Fetch all sellers (admin view)
  async getAll(): Promise<Seller[]> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get seller by ID
  async getById(id: string): Promise<Seller | null> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  // Get seller by user_id
  async getByUserId(userId: string): Promise<Seller | null> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create a new seller (admin creates user first, then seller profile)
  async create(sellerData: {
    user_id: string;
    store_name: string;
    store_description?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    business_address?: string;
    is_active?: boolean;
    is_verified?: boolean;
  }): Promise<Seller> {
    const { data, error } = await supabase
      .from('sellers')
      .insert([{
        user_id: sellerData.user_id,
        store_name: sellerData.store_name,
        store_description: sellerData.store_description || null,
        logo_url: sellerData.logo_url || null,
        contact_email: sellerData.contact_email || null,
        contact_phone: sellerData.contact_phone || null,
        business_address: sellerData.business_address || null,
        is_active: sellerData.is_active ?? false,
        is_verified: sellerData.is_verified ?? false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update seller (admin only)
  async update(id: string, updates: Partial<Omit<Seller, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Seller> {
    const { data, error } = await supabase
      .from('sellers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete seller
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sellers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Toggle active status
  async toggleActive(id: string, currentStatus: boolean): Promise<Seller> {
    return this.update(id, { is_active: !currentStatus });
  },

  // Toggle verified status
  async toggleVerified(id: string, currentStatus: boolean): Promise<Seller> {
    return this.update(id, { is_verified: !currentStatus });
  },

  // Get products count for a seller
  async getProductsCount(sellerId: string): Promise<number> {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    if (error) throw error;
    return count || 0;
  },
};

// =====================================================
// PRODUCT SERVICE EXTENSION (for seller assignment)
// =====================================================

export const productServiceExtended = {
  ...productService,

  // Get products with seller info
  async getAllWithSeller(): Promise<(Product & { seller?: Seller })[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller:sellers(id, store_name, is_verified)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get products by seller
  async getBySellerFiltered(sellerId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Assign product to seller
  async assignToSeller(productId: string, sellerId: string | null): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ seller_id: sellerId })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
