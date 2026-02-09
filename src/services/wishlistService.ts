/**
 * Wishlist Service - Supabase Integration
 * 
 * Manages wishlist operations with the wishlists table.
 * Each user can save products for later purchase.
 */

import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { Product } from '../types';
import { productService } from './productService';
import { useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface DBWishlistItem {
    id: string;
    user_id: string;
    product_id: string;
    created_at: string;
}

export interface WishlistItemWithProduct extends DBWishlistItem {
    product: Product;
}

export interface WishlistResult {
    items: WishlistItemWithProduct[];
    error?: string;
}

// =====================================================
// WISHLIST SERVICE
// =====================================================

export const wishlistService = {
    /**
     * Get all wishlist items with product details
     */
    async getWishlistItems(): Promise<WishlistResult> {
        if (!isSupabaseConfigured()) {
            return { items: [], error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { items: [], error: 'User not logged in' };
            }

            const { data: wishlistItems, error } = await supabase
                .from('wishlists')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                return { items: [], error: error.message };
            }

            // Fetch product details for each wishlist item
            const itemsWithProducts: WishlistItemWithProduct[] = [];
            for (const item of wishlistItems || []) {
                const { product } = await productService.getProductById(item.product_id);
                if (product) {
                    itemsWithProducts.push({
                        ...item,
                        product,
                    });
                }
            }

            return { items: itemsWithProducts };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { items: [], error: message };
        }
    },

    /**
     * Check if a product is in the wishlist
     */
    async isInWishlist(productId: string): Promise<{ isInWishlist: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { isInWishlist: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { isInWishlist: false, error: 'User not logged in' };
            }

            const { data, error } = await supabase
                .from('wishlists')
                .select('id')
                .eq('user_id', user.id)
                .eq('product_id', productId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                return { isInWishlist: false, error: error.message };
            }

            return { isInWishlist: !!data };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { isInWishlist: false, error: message };
        }
    },

    /**
     * Add product to wishlist
     */
    async addToWishlist(productId: string): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not logged in' };
            }

            const { error } = await supabase
                .from('wishlists')
                .insert({
                    user_id: user.id,
                    product_id: productId,
                });

            if (error) {
                // Handle duplicate entry
                if (error.code === '23505') {
                    return { success: true }; // Already in wishlist
                }
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Remove product from wishlist
     */
    async removeFromWishlist(productId: string): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not logged in' };
            }

            const { error } = await supabase
                .from('wishlists')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Toggle product in wishlist
     */
    async toggleWishlist(productId: string): Promise<{ isInWishlist: boolean; error?: string }> {
        const { isInWishlist } = await this.isInWishlist(productId);

        if (isInWishlist) {
            const { error } = await this.removeFromWishlist(productId);
            return { isInWishlist: false, error };
        } else {
            const { error } = await this.addToWishlist(productId);
            return { isInWishlist: true, error };
        }
    },

    /**
     * Get wishlist count
     */
    async getWishlistCount(): Promise<{ count: number; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { count: 0, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { count: 0, error: 'User not logged in' };
            }

            const { count, error } = await supabase
                .from('wishlists')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (error) {
                return { count: 0, error: error.message };
            }

            return { count: count || 0 };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { count: 0, error: message };
        }
    },

    /**
     * Clear entire wishlist
     */
    async clearWishlist(): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not logged in' };
            }

            const { error } = await supabase
                .from('wishlists')
                .delete()
                .eq('user_id', user.id);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },
};

// =====================================================
// HOOKS
// =====================================================

export function useWishlist() {
    const [items, setItems] = useState<WishlistItemWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWishlist = useCallback(async () => {
        setLoading(true);
        setError(null);

        const result = await wishlistService.getWishlistItems();

        setItems(result.items);
        setError(result.error || null);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    return { items, loading, error, refetch: fetchWishlist };
}

export function useWishlistCount() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchCount = useCallback(async () => {
        setLoading(true);
        const result = await wishlistService.getWishlistCount();
        setCount(result.count);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    return { count, loading, refetch: fetchCount };
}

export function useIsInWishlist(productId: string) {
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkWishlist = useCallback(async () => {
        setLoading(true);
        const result = await wishlistService.isInWishlist(productId);
        setIsInWishlist(result.isInWishlist);
        setLoading(false);
    }, [productId]);

    useEffect(() => {
        checkWishlist();
    }, [checkWishlist]);

    return { isInWishlist, loading, refetch: checkWishlist };
}
