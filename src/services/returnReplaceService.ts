// Return/Replace Service - Handle return and replacement requests
import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import {
    ReturnReplaceRequest,
    ReturnReplaceTimeline,
    Insertable,
    Updateable,
} from '../types/database';
import { productService } from './productService';

export type RequestType = 'return' | 'replace';
export type RequestStatus =
    | 'requested'
    | 'approved'
    | 'pickup_scheduled'
    | 'picked_up'
    | 'inspection'
    | 'completed'
    | 'rejected'
    | 'cancelled';
export type RequestReason =
    | 'damaged'
    | 'defective'
    | 'wrong_item'
    | 'wrong_size'
    | 'wrong_color'
    | 'quality_issue'
    | 'not_as_described'
    | 'missing_parts'
    | 'other';

export interface ReturnReplaceSubmission {
    orderId: string;
    orderItemId: string;
    requestType: RequestType;
    reason: RequestReason;
    description?: string;
    customerImages?: string[];
    pickupAddress?: string;
    pickupCity?: string;
    pickupPincode?: string;
}

export interface EligibilityCheck {
    canReturn: boolean;
    canReplace: boolean;
    returnEligibleUntil: string | null;
    replaceEligibleUntil: string | null;
    daysRemainingReturn: number;
    daysRemainingReplace: number;
}

// ============================================
// ELIGIBILITY CHECKING
// ============================================

/**
 * Check if an order item is eligible for return/replace
 */
export async function checkEligibility(
    orderItemId: string
): Promise<EligibilityCheck> {
    const defaultResult: EligibilityCheck = {
        canReturn: false,
        canReplace: false,
        returnEligibleUntil: null,
        replaceEligibleUntil: null,
        daysRemainingReturn: 0,
        daysRemainingReplace: 0,
    };

    if (!isSupabaseConfigured()) return defaultResult;

    try {
        const { data: orderItem, error } = await getSupabase()
            .from('order_items')
            .select(
                `
        id,
        is_returnable,
        is_replaceable,
        return_eligible_until,
        replace_eligible_until,
        delivered_at,
        item_status
      `
            )
            .eq('id', orderItemId)
            .single();

        if (error || !orderItem) return defaultResult;

        // Must be delivered to be eligible
        if (orderItem.item_status !== 'delivered' || !orderItem.delivered_at) {
            return defaultResult;
        }

        const now = new Date();
        const returnUntil = orderItem.return_eligible_until
            ? new Date(orderItem.return_eligible_until)
            : null;
        const replaceUntil = orderItem.replace_eligible_until
            ? new Date(orderItem.replace_eligible_until)
            : null;

        const daysRemainingReturn = returnUntil
            ? Math.max(0, Math.ceil((returnUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
        const daysRemainingReplace = replaceUntil
            ? Math.max(0, Math.ceil((replaceUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;

        // Check for existing pending requests
        const { data: existingRequest } = await getSupabase()
            .from('return_replace_requests')
            .select('id')
            .eq('order_item_id', orderItemId)
            .not('status', 'in', '("completed","rejected","cancelled")')
            .single();

        if (existingRequest) {
            // There's already a pending request
            return defaultResult;
        }

        return {
            canReturn: orderItem.is_returnable && returnUntil ? now < returnUntil : false,
            canReplace: orderItem.is_replaceable && replaceUntil ? now < replaceUntil : false,
            returnEligibleUntil: orderItem.return_eligible_until,
            replaceEligibleUntil: orderItem.replace_eligible_until,
            daysRemainingReturn,
            daysRemainingReplace,
        };
    } catch (err) {
        console.error('Error checking eligibility:', err);
        return defaultResult;
    }
}

// ============================================
// REQUEST SUBMISSION
// ============================================

/**
 * Submit a return or replace request
 */
export async function submitRequest(
    userId: string,
    data: ReturnReplaceSubmission
): Promise<{ request: ReturnReplaceRequest | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { request: null, error: 'Supabase not configured' };
    }

    try {
        // Check eligibility first
        const eligibility = await checkEligibility(data.orderItemId);

        if (data.requestType === 'return' && !eligibility.canReturn) {
            return { request: null, error: 'Item is not eligible for return' };
        }

        if (data.requestType === 'replace' && !eligibility.canReplace) {
            return { request: null, error: 'Item is not eligible for replacement' };
        }

        // Get order item details for snapshot
        const { data: orderItem } = await getSupabase()
            .from('order_items')
            .select(
                `
        product_name,
        product_image,
        unit_price,
        quantity,
        seller_id,
        return_eligible_until,
        replace_eligible_until
      `
            )
            .eq('id', data.orderItemId)
            .single();

        const windowEndDate =
            data.requestType === 'return'
                ? eligibility.returnEligibleUntil
                : eligibility.replaceEligibleUntil;

        const insertData: Insertable<'return_replace_requests'> = {
            order_id: data.orderId,
            order_item_id: data.orderItemId,
            user_id: userId,
            seller_id: orderItem?.seller_id || null,
            request_type: data.requestType,
            reason: data.reason,
            description: data.description || null,
            customer_images: data.customerImages || [],
            is_within_window: true,
            window_end_date: windowEndDate,
            product_name: orderItem?.product_name || null,
            product_image: orderItem?.product_image || null,
            unit_price: orderItem?.unit_price || null,
            quantity: orderItem?.quantity || 1,
            pickup_address: data.pickupAddress || null,
            pickup_city: data.pickupCity || null,
            pickup_pincode: data.pickupPincode || null,
        };

        const { data: request, error } = await getSupabase()
            .from('return_replace_requests')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;

        // Add initial timeline entry
        await getSupabase().from('return_replace_timeline').insert({
            request_id: request.id,
            status: 'requested',
            title: 'Request Submitted',
            notes: `${data.requestType === 'return' ? 'Return' : 'Replacement'} request submitted successfully`,
        });

        return { request, error: null };
    } catch (err: any) {
        console.error('Error submitting request:', err);
        return { request: null, error: err.message || 'Failed to submit request' };
    }
}

/**
 * Cancel a request (only if still in requested status)
 */
export async function cancelRequest(
    userId: string,
    requestId: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data: request } = await getSupabase()
            .from('return_replace_requests')
            .select('status')
            .eq('id', requestId)
            .eq('user_id', userId)
            .single();

        if (!request) {
            return { success: false, error: 'Request not found' };
        }

        if (request.status !== 'requested') {
            return { success: false, error: 'Request cannot be cancelled at this stage' };
        }

        const { error } = await getSupabase()
            .from('return_replace_requests')
            .update({ status: 'cancelled' })
            .eq('id', requestId)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error cancelling request:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// REQUEST RETRIEVAL
// ============================================

/**
 * Get user's return/replace requests
 */
export async function getUserRequests(
    userId: string,
    status?: RequestStatus
): Promise<ReturnReplaceRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        let query = getSupabase()
            .from('return_replace_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching user requests:', err);
        return [];
    }
}

/**
 * Get request by ID
 */
export async function getRequestById(
    requestId: string,
    userId: string
): Promise<ReturnReplaceRequest | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await getSupabase()
            .from('return_replace_requests')
            .select('*')
            .eq('id', requestId)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching request:', err);
        return null;
    }
}

/**
 * Get request with full details including timeline
 */
export async function getRequestWithDetails(
    requestId: string,
    userId: string
): Promise<{ request: ReturnReplaceRequest | null; timeline: ReturnReplaceTimeline[] }> {
    if (!isSupabaseConfigured()) {
        return { request: null, timeline: [] };
    }

    try {
        const { data: request, error: reqError } = await getSupabase()
            .from('return_replace_requests')
            .select('*')
            .eq('id', requestId)
            .eq('user_id', userId)
            .single();

        if (reqError) throw reqError;

        const { data: timeline, error: timelineError } = await getSupabase()
            .from('return_replace_timeline')
            .select('*')
            .eq('request_id', requestId)
            .eq('is_customer_visible', true)
            .order('created_at', { ascending: false });

        if (timelineError) throw timelineError;

        return { request, timeline: timeline || [] };
    } catch (err) {
        console.error('Error fetching request details:', err);
        return { request: null, timeline: [] };
    }
}

// ============================================
// SELLER/ADMIN ACTIONS
// ============================================

/**
 * Approve a request (seller/admin action)
 */
export async function approveRequest(
    requestId: string,
    sellerId: string,
    notes?: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('return_replace_requests')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                resolution_notes: notes || null,
            })
            .eq('id', requestId)
            .eq('seller_id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error approving request:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Reject a request (seller/admin action)
 */
export async function rejectRequest(
    requestId: string,
    sellerId: string,
    reason: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('return_replace_requests')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
            })
            .eq('id', requestId)
            .eq('seller_id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error rejecting request:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Schedule pickup for return/replace
 */
export async function schedulePickup(
    requestId: string,
    sellerId: string,
    pickupDate: string,
    courierPartner?: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('return_replace_requests')
            .update({
                status: 'pickup_scheduled',
                pickup_scheduled_date: pickupDate,
                courier_partner: courierPartner || null,
            })
            .eq('id', requestId)
            .eq('seller_id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error scheduling pickup:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Mark pickup as completed
 */
export async function markPickupCompleted(
    requestId: string,
    sellerId: string,
    trackingNumber?: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('return_replace_requests')
            .update({
                status: 'picked_up',
                pickup_completed_at: new Date().toISOString(),
                pickup_tracking_number: trackingNumber || null,
            })
            .eq('id', requestId)
            .eq('seller_id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error marking pickup completed:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Complete request with refund/replacement
 */
export async function completeRequest(
    requestId: string,
    sellerId: string,
    resolution: {
        refundAmount?: number;
        replacementOrderId?: string;
        notes?: string;
    }
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('return_replace_requests')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                refund_amount: resolution.refundAmount || null,
                refund_status: resolution.refundAmount ? 'processed' : null,
                replacement_order_id: resolution.replacementOrderId || null,
                resolution_notes: resolution.notes || null,
            })
            .eq('id', requestId)
            .eq('seller_id', sellerId);

        if (error) throw error;

        // Update order item status
        const { data: request } = await getSupabase()
            .from('return_replace_requests')
            .select('order_item_id, request_type, quantity')
            .eq('id', requestId)
            .single();

        if (request) {
            await getSupabase()
                .from('order_items')
                .update({
                    item_status: request.request_type === 'return' ? 'returned' : 'replaced',
                })
                .eq('id', request.order_item_id);

            // Increment stock if return
            if (request.request_type === 'return') {
                const { data: orderItem } = await getSupabase()
                    .from('order_items')
                    .select('product_id')
                    .eq('id', request.order_item_id)
                    .single();

                if (orderItem && orderItem.product_id) {
                    await productService.updateStock(orderItem.product_id, request.quantity || 1);
                }
            }
        }

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error completing request:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get requests for a seller
 */
export async function getSellerRequests(
    sellerId: string,
    status?: RequestStatus,
    limit = 20,
    offset = 0
): Promise<ReturnReplaceRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        let query = getSupabase()
            .from('return_replace_requests')
            .select('*')
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching seller requests:', err);
        return [];
    }
}

export const returnReplaceService = {
    checkEligibility,
    submitRequest,
    cancelRequest,
    getUserRequests,
    getRequestById,
    getRequestWithDetails,
    approveRequest,
    rejectRequest,
    schedulePickup,
    markPickupCompleted,
    completeRequest,
    getSellerRequests,
};

export default returnReplaceService;
