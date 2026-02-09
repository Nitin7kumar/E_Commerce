/**
 * Coupon Service - Supabase Integration
 * 
 * Validates and applies discount coupons using the coupons table
 * and the validate_coupon Postgres function.
 */

import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { useState, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface CouponValidationResult {
    is_valid: boolean;
    coupon_id: string | null;
    discount_amount: number;
    error_message: string | null;
}

export interface AppliedCoupon {
    code: string;
    couponId: string;
    discountAmount: number;
    discountType: 'percent' | 'fixed';
    discountValue: number;
}

export interface DBCoupon {
    id: string;
    code: string;
    name: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_discount_amount: number | null;
    min_order_value: number;
    max_uses: number | null;
    max_uses_per_user: number;
    current_uses: number;
    valid_from: string;
    valid_until: string | null;
    applicable_categories: string[] | null;
    applicable_products: string[] | null;
    first_order_only: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// =====================================================
// COUPON SERVICE
// =====================================================

export const couponService = {
    /**
     * Validate a coupon code using the database function
     */
    async validateCoupon(
        code: string,
        orderValue: number
    ): Promise<{ valid: boolean; discount: number; couponId?: string; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { valid: false, discount: 0, error: 'Supabase not configured' };
        }

        if (!code.trim()) {
            return { valid: false, discount: 0, error: 'Please enter a coupon code' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { valid: false, discount: 0, error: 'User not logged in' };
            }

            // Call the validate_coupon function
            const { data, error } = await supabase
                .rpc('validate_coupon', {
                    p_code: code,
                    p_user_id: user.id,
                    p_order_value: orderValue,
                });

            if (error) {
                // Fallback to manual validation if function doesn't exist
                return this.validateCouponManually(code, orderValue, user.id);
            }

            const result = data?.[0] as CouponValidationResult | undefined;

            if (!result) {
                return { valid: false, discount: 0, error: 'Invalid response from server' };
            }

            if (!result.is_valid) {
                return {
                    valid: false,
                    discount: 0,
                    error: result.error_message || 'Invalid coupon code'
                };
            }

            return {
                valid: true,
                discount: result.discount_amount,
                couponId: result.coupon_id || undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { valid: false, discount: 0, error: message };
        }
    },

    /**
     * Manual coupon validation (fallback if RPC function doesn't exist)
     */
    async validateCouponManually(
        code: string,
        orderValue: number,
        userId: string
    ): Promise<{ valid: boolean; discount: number; couponId?: string; error?: string }> {
        try {
            const supabase = getSupabase();

            // Find the coupon
            const { data: coupon, error } = await supabase
                .from('coupons')
                .select('*')
                .ilike('code', code)
                .eq('is_active', true)
                .single();

            if (error || !coupon) {
                return { valid: false, discount: 0, error: 'Invalid coupon code' };
            }

            // Check validity period
            const now = new Date();
            if (new Date(coupon.valid_from) > now) {
                return { valid: false, discount: 0, error: 'Coupon is not yet active' };
            }

            if (coupon.valid_until && new Date(coupon.valid_until) < now) {
                return { valid: false, discount: 0, error: 'Coupon has expired' };
            }

            // Check minimum order value
            if (orderValue < coupon.min_order_value) {
                return {
                    valid: false,
                    discount: 0,
                    error: `Minimum order value is ₹${coupon.min_order_value}`
                };
            }

            // Check total usage limit
            if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
                return { valid: false, discount: 0, error: 'Coupon usage limit reached' };
            }

            // Check per-user usage limit
            const { count: userUses } = await supabase
                .from('coupon_usages')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id)
                .eq('user_id', userId);

            if ((userUses || 0) >= coupon.max_uses_per_user) {
                return { valid: false, discount: 0, error: 'You have already used this coupon' };
            }

            // Calculate discount
            let discount = 0;
            if (coupon.discount_type === 'percent') {
                discount = orderValue * (coupon.discount_value / 100);
                if (coupon.max_discount_amount !== null) {
                    discount = Math.min(discount, coupon.max_discount_amount);
                }
            } else {
                discount = coupon.discount_value;
            }

            // Discount cannot exceed order value
            discount = Math.min(discount, orderValue);

            return {
                valid: true,
                discount,
                couponId: coupon.id,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { valid: false, discount: 0, error: message };
        }
    },

    /**
     * Apply a coupon to an order (record usage)
     */
    async applyCoupon(
        couponId: string,
        orderId: string,
        discountAmount: number
    ): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not logged in' };
            }

            // Record coupon usage
            const { error: usageError } = await supabase
                .from('coupon_usages')
                .insert({
                    coupon_id: couponId,
                    user_id: user.id,
                    order_id: orderId,
                    discount_amount: discountAmount,
                });

            if (usageError) {
                return { success: false, error: usageError.message };
            }

            // Increment current_uses on the coupon
            await supabase
                .from('coupons')
                .update({
                    current_uses: supabase.rpc('increment', { row_id: couponId }),
                })
                .eq('id', couponId);

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Get available coupons for display
     */
    async getAvailableCoupons(): Promise<{ coupons: DBCoupon[]; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { coupons: [], error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('is_active', true)
                .lte('valid_from', now)
                .or(`valid_until.is.null,valid_until.gte.${now}`)
                .order('discount_value', { ascending: false });

            if (error) {
                return { coupons: [], error: error.message };
            }

            // Filter out coupons that have reached their max usage
            const availableCoupons = (data || []).filter(c =>
                c.max_uses === null || c.current_uses < c.max_uses
            );

            return { coupons: availableCoupons };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { coupons: [], error: message };
        }
    },
};

// =====================================================
// HOOKS
// =====================================================

export function useCouponValidation() {
    const [isValidating, setIsValidating] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<{
        code: string;
        couponId: string;
        discount: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const validateCoupon = useCallback(async (code: string, orderValue: number) => {
        setIsValidating(true);
        setError(null);

        const result = await couponService.validateCoupon(code, orderValue);

        if (result.valid && result.couponId) {
            setAppliedCoupon({
                code: code.toUpperCase(),
                couponId: result.couponId,
                discount: result.discount,
            });
            setError(null);
        } else {
            setAppliedCoupon(null);
            setError(result.error || 'Invalid coupon');
        }

        setIsValidating(false);
        return result;
    }, []);

    const removeCoupon = useCallback(() => {
        setAppliedCoupon(null);
        setError(null);
    }, []);

    return {
        validateCoupon,
        removeCoupon,
        appliedCoupon,
        isValidating,
        error
    };
}
