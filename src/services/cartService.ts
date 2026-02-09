/**
 * Cart Service - Supabase Integration
 * 
 * Manages shopping cart operations with the carts and cart_items tables.
 * Each user has one active cart at a time.
 */

import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { Product } from '../types';
import { productService } from './productService';
import { useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface DBCartItem {
    id: string;
    cart_id: string;
    product_id: string;
    quantity: number;
    selected_size: string | null;
    selected_color: string | null;
    price_at_add: number | null;
    created_at: string;
    updated_at: string;
}

export interface DBCart {
    id: string;
    user_id: string;
    status: 'active' | 'checked_out' | 'abandoned';
    guest_token: string | null;
    created_at: string;
    updated_at: string;
}

export interface CartItemWithProduct extends DBCartItem {
    product: Product;
}

export interface CartResult {
    cart: DBCart | null;
    items: CartItemWithProduct[];
    error?: string;
}

// =====================================================
// CART SERVICE
// =====================================================

export const cartService = {
    /**
     * Get or create the user's active cart
     */
    async getOrCreateCart(): Promise<{ cart: DBCart | null; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { cart: null, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { cart: null, error: 'User not logged in' };
            }

            // Try to get existing active cart
            const { data: existingCart, error: fetchError } = await supabase
                .from('carts')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (existingCart) {
                return { cart: existingCart };
            }

            // Create new cart if none exists
            const { data: newCart, error: createError } = await supabase
                .from('carts')
                .insert({ user_id: user.id, status: 'active' })
                .select()
                .single();

            if (createError) {
                // Handle race condition - cart may have been created by another request
                if (createError.code === '23505') { // Unique constraint violation
                    const { data: retryCart } = await supabase
                        .from('carts')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .single();
                    return { cart: retryCart };
                }
                return { cart: null, error: createError.message };
            }

            return { cart: newCart };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { cart: null, error: message };
        }
    },

    /**
     * Get cart items with product details
     */
    async getCartItems(): Promise<CartResult> {
        if (!isSupabaseConfigured()) {
            return { cart: null, items: [], error: 'Supabase not configured' };
        }

        try {
            const { cart, error: cartError } = await this.getOrCreateCart();
            if (cartError || !cart) {
                return { cart: null, items: [], error: cartError };
            }

            const supabase = getSupabase();
            const { data: cartItems, error: itemsError } = await supabase
                .from('cart_items')
                .select('*')
                .eq('cart_id', cart.id)
                .order('created_at', { ascending: false });

            if (itemsError) {
                return { cart, items: [], error: itemsError.message };
            }

            // Fetch product details for each cart item
            const itemsWithProducts: CartItemWithProduct[] = [];
            for (const item of cartItems || []) {
                const { product } = await productService.getProductById(item.product_id);
                if (product) {
                    itemsWithProducts.push({
                        ...item,
                        product,
                    });
                }
            }

            return { cart, items: itemsWithProducts };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { cart: null, items: [], error: message };
        }
    },

    /**
     * Add item to cart (or increment quantity if exists)
     */
    async addToCart(
        productId: string,
        quantity: number = 1,
        selectedSize?: string,
        selectedColor?: string,
        priceAtAdd?: number
    ): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { cart, error: cartError } = await this.getOrCreateCart();
            if (cartError || !cart) {
                return { success: false, error: cartError || 'Failed to get cart' };
            }

            const supabase = getSupabase();

            // Check if item already exists with same variant
            const { data: existingItem } = await supabase
                .from('cart_items')
                .select('*')
                .eq('cart_id', cart.id)
                .eq('product_id', productId)
                .eq('selected_size', selectedSize || '')
                .eq('selected_color', selectedColor || '')
                .single();

            if (existingItem) {
                // Update quantity
                const { error: updateError } = await supabase
                    .from('cart_items')
                    .update({
                        quantity: existingItem.quantity + quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingItem.id);

                if (updateError) {
                    return { success: false, error: updateError.message };
                }
            } else {
                // Insert new item
                const { error: insertError } = await supabase
                    .from('cart_items')
                    .insert({
                        cart_id: cart.id,
                        product_id: productId,
                        quantity,
                        selected_size: selectedSize || null,
                        selected_color: selectedColor || null,
                        price_at_add: priceAtAdd || null,
                    });

                if (insertError) {
                    return { success: false, error: insertError.message };
                }
            }

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Update item quantity in cart
     */
    async updateQuantity(
        cartItemId: string,
        quantity: number
    ): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            if (quantity <= 0) {
                // Remove item if quantity is 0 or less
                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('id', cartItemId);

                if (error) {
                    return { success: false, error: error.message };
                }
            } else {
                // Update quantity
                const { error } = await supabase
                    .from('cart_items')
                    .update({
                        quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', cartItemId);

                if (error) {
                    return { success: false, error: error.message };
                }
            }

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Remove item from cart
     */
    async removeFromCart(cartItemId: string): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('id', cartItemId);

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
     * Clear all items from cart
     */
    async clearCart(): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { cart, error: cartError } = await this.getOrCreateCart();
            if (cartError || !cart) {
                return { success: false, error: cartError || 'Failed to get cart' };
            }

            const supabase = getSupabase();
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('cart_id', cart.id);

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
     * Get cart item count
     */
    async getCartCount(): Promise<{ count: number; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { count: 0, error: 'Supabase not configured' };
        }

        try {
            const { cart, error: cartError } = await this.getOrCreateCart();
            if (cartError || !cart) {
                return { count: 0, error: cartError };
            }

            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('cart_items')
                .select('quantity')
                .eq('cart_id', cart.id);

            if (error) {
                return { count: 0, error: error.message };
            }

            const totalCount = (data || []).reduce((sum, item) => sum + item.quantity, 0);
            return { count: totalCount };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { count: 0, error: message };
        }
    },

    /**
     * Mark cart as checked out
     */
    async checkoutCart(): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { cart, error: cartError } = await this.getOrCreateCart();
            if (cartError || !cart) {
                return { success: false, error: cartError || 'Failed to get cart' };
            }

            const supabase = getSupabase();
            const { error } = await supabase
                .from('carts')
                .update({
                    status: 'checked_out',
                    updated_at: new Date().toISOString()
                })
                .eq('id', cart.id);

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

export function useCart() {
    const [cart, setCart] = useState<DBCart | null>(null);
    const [items, setItems] = useState<CartItemWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCart = useCallback(async () => {
        setLoading(true);
        setError(null);

        const result = await cartService.getCartItems();

        setCart(result.cart);
        setItems(result.items);
        setError(result.error || null);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalDiscount = items.reduce(
        (sum, item) => sum + (item.product.originalPrice - item.product.price) * item.quantity,
        0
    );

    return {
        cart,
        items,
        loading,
        error,
        refetch: fetchCart,
        totalItems,
        totalPrice,
        totalDiscount,
    };
}

export function useCartCount() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchCount = useCallback(async () => {
        setLoading(true);
        const result = await cartService.getCartCount();
        setCount(result.count);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    return { count, loading, refetch: fetchCount };
}
