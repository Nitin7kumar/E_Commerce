// Rating Service - Customer ratings and reviews management
import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import {
    CustomerRating,
    ProductRatingSummary,
    Insertable,
    Updateable,
} from '../types/database';

export interface RatingSubmission {
    productId: string;
    orderItemId: string;
    rating: number;
    title?: string;
    reviewText?: string;
    images?: string[];
}

export interface RatingFilters {
    rating?: number; // Filter by specific star rating
    withImages?: boolean;
    withText?: boolean;
    sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
    limit?: number;
    offset?: number;
}

// ============================================
// CUSTOMER RATINGS
// ============================================

/**
 * Submit a rating for a purchased product
 */
export async function submitRating(
    userId: string,
    data: RatingSubmission
): Promise<{ rating: CustomerRating | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { rating: null, error: 'Supabase not configured' };
    }

    try {
        // Check if user already rated this order item
        const { data: existing } = await getSupabase()
            .from('customer_ratings')
            .select('id')
            .eq('order_item_id', data.orderItemId)
            .single();

        if (existing) {
            return { rating: null, error: 'You have already rated this item' };
        }

        const insertData: Insertable<'customer_ratings'> = {
            product_id: data.productId,
            order_item_id: data.orderItemId,
            user_id: userId,
            rating: data.rating,
            title: data.title || null,
            review_text: data.reviewText || null,
            images: data.images || [],
            is_verified_purchase: true,
            is_approved: true,
        };

        const { data: rating, error } = await getSupabase()
            .from('customer_ratings')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        // Mark order item as rated
        await getSupabase()
            .from('order_items')
            .update({ is_rated: true })
            .eq('id', data.orderItemId);

        return { rating, error: null };
    } catch (err: any) {
        console.error('Error submitting rating:', err);
        return { rating: null, error: err.message || 'Failed to submit rating' };
    }
}

/**
 * Update an existing rating
 */
export async function updateRating(
    userId: string,
    ratingId: string,
    updates: {
        rating?: number;
        title?: string;
        reviewText?: string;
        images?: string[];
    }
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const updateData: Updateable<'customer_ratings'> = {};

        if (updates.rating !== undefined) updateData.rating = updates.rating;
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.reviewText !== undefined)
            updateData.review_text = updates.reviewText;
        if (updates.images !== undefined) updateData.images = updates.images;

        const { error } = await getSupabase()
            .from('customer_ratings')
            .update(updateData)
            .eq('id', ratingId)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error updating rating:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Delete a rating
 */
export async function deleteRating(
    userId: string,
    ratingId: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('customer_ratings')
            .delete()
            .eq('id', ratingId)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error deleting rating:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get ratings for a product
 */
export async function getProductRatings(
    productId: string,
    filters: RatingFilters = {}
): Promise<CustomerRating[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        let query = getSupabase()
            .from('customer_ratings')
            .select(
                `
        *,
        profiles:user_id (
          name,
          profile_image_url
        )
      `
            )
            .eq('product_id', productId)
            .eq('is_approved', true);

        // Apply filters
        if (filters.rating) {
            query = query.eq('rating', filters.rating);
        }

        if (filters.withImages) {
            query = query.not('images', 'eq', '{}');
        }

        if (filters.withText) {
            query = query.not('review_text', 'is', null);
        }

        // Sorting
        switch (filters.sortBy) {
            case 'helpful':
                query = query.order('helpful_count', { ascending: false });
                break;
            case 'rating_high':
                query = query.order('rating', { ascending: false });
                break;
            case 'rating_low':
                query = query.order('rating', { ascending: true });
                break;
            case 'recent':
            default:
                query = query.order('created_at', { ascending: false });
        }

        // Pagination
        const limit = filters.limit || 10;
        const offset = filters.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching product ratings:', err);
        return [];
    }
}

/**
 * Get user's own ratings
 */
export async function getUserRatings(userId: string): Promise<CustomerRating[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        const { data, error } = await getSupabase()
            .from('customer_ratings')
            .select(
                `
        *,
        products:product_id (
          name,
          brand,
          images
        )
      `
            )
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching user ratings:', err);
        return [];
    }
}

// ============================================
// PRODUCT RATING SUMMARY
// ============================================

/**
 * Get rating summary for a product
 */
export async function getProductRatingSummary(
    productId: string
): Promise<ProductRatingSummary | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await getSupabase()
            .from('product_rating_summary')
            .select('*')
            .eq('product_id', productId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('Error fetching rating summary:', err);
        return null;
    }
}

/**
 * Get rating summaries for multiple products
 */
export async function getProductsRatingSummaries(
    productIds: string[]
): Promise<Map<string, ProductRatingSummary>> {
    const summaryMap = new Map<string, ProductRatingSummary>();
    if (!isSupabaseConfigured() || productIds.length === 0) return summaryMap;

    try {
        const { data, error } = await getSupabase()
            .from('product_rating_summary')
            .select('*')
            .in('product_id', productIds);

        if (error) throw error;

        data?.forEach((summary) => {
            summaryMap.set(summary.product_id, summary);
        });

        return summaryMap;
    } catch (err) {
        console.error('Error fetching rating summaries:', err);
        return summaryMap;
    }
}

// ============================================
// HELPFUL VOTES
// ============================================

/**
 * Vote on whether a rating was helpful
 */
export async function voteRatingHelpful(
    userId: string,
    ratingId: string,
    isHelpful: boolean
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        // Upsert vote
        const { error } = await getSupabase().from('rating_helpful_votes').upsert(
            {
                rating_id: ratingId,
                user_id: userId,
                is_helpful: isHelpful,
            },
            {
                onConflict: 'rating_id,user_id',
            }
        );

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error voting on rating:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get user's vote on a rating
 */
export async function getUserVote(
    userId: string,
    ratingId: string
): Promise<boolean | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await getSupabase()
            .from('rating_helpful_votes')
            .select('is_helpful')
            .eq('rating_id', ratingId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data?.is_helpful ?? null;
    } catch (err) {
        console.error('Error fetching user vote:', err);
        return null;
    }
}

// ============================================
// SELLER RESPONSES
// ============================================

/**
 * Add seller response to a rating
 */
export async function addSellerResponse(
    sellerId: string,
    ratingId: string,
    response: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        // Verify the rating is for a product owned by this seller
        const { data: rating } = await getSupabase()
            .from('customer_ratings')
            .select(
                `
        id,
        products:product_id (
          seller_id
        )
      `
            )
            .eq('id', ratingId)
            .single();

        if (!rating || (rating as any).products?.seller_id !== sellerId) {
            return { success: false, error: 'Unauthorized' };
        }

        const { error } = await getSupabase()
            .from('customer_ratings')
            .update({
                seller_response: response,
                seller_responded_at: new Date().toISOString(),
            })
            .eq('id', ratingId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error adding seller response:', err);
        return { success: false, error: err.message };
    }
}

export const ratingService = {
    submitRating,
    updateRating,
    deleteRating,
    getProductRatings,
    getUserRatings,
    getProductRatingSummary,
    getProductsRatingSummaries,
    voteRatingHelpful,
    getUserVote,
    addSellerResponse,
};

export default ratingService;
