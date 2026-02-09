import { createClient } from '@supabase/supabase-js';

// Same Supabase credentials as admin dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xskeecvleyzwlgpxfrsb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza2VlY3ZsZXl6d2xncHhmcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjA4MTEsImV4cCI6MjA4NTU5NjgxMX0.vnd2tFx5hvMG2iMZpYqMUV3YLMSnTPpCG5f-w5pxuno';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// SELLER TYPES
// =====================================================

export interface Seller {
    id: string;
    user_id: string;
    store_name: string;
    store_description: string | null;
    logo_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    business_address: string | null;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProductColor {
    name: string;
    hex: string;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    mrp: number | null;              // Maximum Retail Price (original price)
    discount_percent: number;        // Discount percentage (0-100)
    category: string | null;
    image_url: string | null;
    stock: number;
    is_active: boolean;
    seller_id: string | null;
    seller_name: string | null;
    created_at: string;
    // Extended attributes
    brand_name: string | null;
    size_type: 'none' | 'clothing' | 'shoe' | 'quantity';
    sizes: string[];
    colors: ProductColor[];
    default_color: string | null;
    images: string[] | null;
    highlights: string[] | null;
    attributes: { [key: string]: string } | null;
}

// =====================================================
// AUTH FUNCTIONS
// =====================================================

export interface SellerUser {
    id: string;
    email: string;
    seller: Seller | null;
}

// Sign in seller
export async function signIn(email: string, password: string): Promise<SellerUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Login failed');

    // Check if user is a seller
    const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

    if (sellerError || !sellerData) {
        await supabase.auth.signOut();
        throw new Error('You are not registered as a seller. Please contact admin.');
    }

    if (!sellerData.is_active) {
        await supabase.auth.signOut();
        throw new Error('Your seller account is not active. Please contact admin.');
    }

    return {
        id: data.user.id,
        email: data.user.email || '',
        seller: sellerData,
    };
}

// Get current seller
export async function getCurrentSeller(): Promise<SellerUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!sellerData || !sellerData.is_active) return null;

    return {
        id: user.id,
        email: user.email || '',
        seller: sellerData,
    };
}

// Sign out
export async function signOut() {
    await supabase.auth.signOut();
}

// =====================================================
// SELLER PRODUCT FUNCTIONS
// =====================================================

export async function getMyProducts(sellerId: string): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function createProduct(sellerId: string, product: Omit<Product, 'id' | 'created_at' | 'seller_id'>): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .insert([{ ...product, seller_id: sellerId }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteProduct(productId: string): Promise<void> {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (error) throw error;
}
