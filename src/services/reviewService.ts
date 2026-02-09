/**
 * Review Service - Supabase Integration
 * 
 * Manages product reviews with the reviews table.
 * Supports creating, fetching, and voting on reviews.
 */

import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface DBReview {
    id: string;
    user_id: string;
    product_id: string;
    order_id: string | null;
    rating: number;
    title: string | null;
    comment: string | null;
    images: string[] | null;
    is_verified_purchase: boolean;
    is_approved: boolean;
    is_featured: boolean;
    helpful_count: number;
    created_at: string;
    updated_at: string;
}

export interface ReviewWithUser extends DBReview {
    user_name: string;
    user_avatar?: string;
}

export interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}

export interface ReviewsResult {
    reviews: ReviewWithUser[];
    stats: ReviewStats | null;
    error?: string;
}

export interface CreateReviewData {
    product_id: string;
    order_id?: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
}

// =====================================================
// REVIEW SERVICE
// =====================================================

export const reviewService = {
    /**
     * Get reviews for a product
     */
    async getProductReviews(productId: string): Promise<ReviewsResult> {
        if (!isSupabaseConfigured()) {
            return { reviews: [], stats: null, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            // Fetch reviews
            const { data: reviews, error } = await supabase
                .from('reviews')
                .select(`
          *,
          profiles:user_id (
            name,
            avatar_url
          )
        `)
                .eq('product_id', productId)
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (error) {
                // Fallback: fetch reviews without profile join
                const { data: fallbackReviews, error: fallbackError } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('product_id', productId)
                    .eq('is_approved', true)
                    .order('created_at', { ascending: false });

                if (fallbackError) {
                    return { reviews: [], stats: null, error: fallbackError.message };
                }

                const reviewsWithUser: ReviewWithUser[] = (fallbackReviews || []).map(r => ({
                    ...r,
                    user_name: 'Anonymous User',
                }));

                const stats = this.calculateStats(reviewsWithUser);
                return { reviews: reviewsWithUser, stats };
            }

            const reviewsWithUser: ReviewWithUser[] = (reviews || []).map(r => {
                const profile = r.profiles as any;
                return {
                    ...r,
                    user_name: profile?.name || 'Anonymous User',
                    user_avatar: profile?.avatar_url,
                    profiles: undefined, // Clean up
                };
            });

            const stats = this.calculateStats(reviewsWithUser);
            return { reviews: reviewsWithUser, stats };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { reviews: [], stats: null, error: message };
        }
    },

    /**
     * Calculate review statistics
     */
    calculateStats(reviews: ReviewWithUser[]): ReviewStats {
        if (reviews.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            };
        }

        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number } = {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
        };

        reviews.forEach(r => {
            const rating = r.rating as 1 | 2 | 3 | 4 | 5;
            if (rating >= 1 && rating <= 5) {
                breakdown[rating]++;
            }
        });

        return {
            averageRating: totalRating / reviews.length,
            totalReviews: reviews.length,
            ratingBreakdown: breakdown,
        };
    },

    /**
     * Create a new review
     */
    async createReview(data: CreateReviewData): Promise<{ success: boolean; review?: DBReview; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not logged in' };
            }

            // Check if user already reviewed this product
            const { data: existingReview } = await supabase
                .from('reviews')
                .select('id')
                .eq('user_id', user.id)
                .eq('product_id', data.product_id)
                .single();

            if (existingReview) {
                // Update existing review
                const { data: updated, error } = await supabase
                    .from('reviews')
                    .update({
                        rating: data.rating,
                        title: data.title || null,
                        comment: data.comment || null,
                        images: data.images || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingReview.id)
                    .select()
                    .single();

                if (error) {
                    return { success: false, error: error.message };
                }

                return { success: true, review: updated };
            }

            // Check if this is a verified purchase
            let isVerifiedPurchase = false;
            if (data.order_id) {
                const { data: order } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('id', data.order_id)
                    .eq('user_id', user.id)
                    .single();

                isVerifiedPurchase = !!order;
            }

            // Create new review
            const { data: review, error } = await supabase
                .from('reviews')
                .insert({
                    user_id: user.id,
                    product_id: data.product_id,
                    order_id: data.order_id || null,
                    rating: data.rating,
                    title: data.title || null,
                    comment: data.comment || null,
                    images: data.images || null,
                    is_verified_purchase: isVerifiedPurchase,
                })
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, review };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Delete a review
     */
    async deleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
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
                .from('reviews')
                .delete()
                .eq('id', reviewId)
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

    /**
     * Vote on a review (helpful/not helpful)
     */
    async voteReview(reviewId: string, voteType: 'helpful' | 'not_helpful'): Promise<{ success: boolean; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'User not logged in' };
            }

            // Upsert the vote
            const { error } = await supabase
                .from('review_votes')
                .upsert({
                    review_id: reviewId,
                    user_id: user.id,
                    vote_type: voteType,
                }, {
                    onConflict: 'user_id,review_id',
                });

            if (error) {
                return { success: false, error: error.message };
            }

            // Update helpful count on the review
            if (voteType === 'helpful') {
                await supabase.rpc('increment_helpful_count', { review_id: reviewId });
            }

            return { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Get user's review for a product
     */
    async getUserReview(productId: string): Promise<{ review?: DBReview; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { error: 'User not logged in' };
            }

            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('user_id', user.id)
                .eq('product_id', productId)
                .single();

            if (error && error.code !== 'PGRST116') {
                return { error: error.message };
            }

            return { review: data || undefined };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: message };
        }
    },
};

// =====================================================
// HOOKS
// =====================================================

export function useProductReviews(productId: string) {
    const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReviews = useCallback(async () => {
        if (!productId) return;

        setLoading(true);
        setError(null);

        const result = await reviewService.getProductReviews(productId);

        setReviews(result.reviews);
        setStats(result.stats);
        setError(result.error || null);
        setLoading(false);
    }, [productId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    return { reviews, stats, loading, error, refetch: fetchReviews };
}

export function useUserReview(productId: string) {
    const [review, setReview] = useState<DBReview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReview = useCallback(async () => {
        if (!productId) return;

        setLoading(true);
        setError(null);

        const result = await reviewService.getUserReview(productId);

        setReview(result.review || null);
        setError(result.error || null);
        setLoading(false);
    }, [productId]);

    useEffect(() => {
        fetchReview();
    }, [fetchReview]);

    return { review, loading, error, refetch: fetchReview };
}
