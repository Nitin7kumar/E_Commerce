// Seller Service - CRUD operations for seller management
import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import {
    Seller,
    Insertable,
    Updateable,
    DbProduct,
} from '../types/database';

export interface SellerRegistration {
    businessName: string;
    businessEmail: string;
    businessPhone: string;
    gstNumber?: string;
    panNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export interface SellerStats {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
    pendingOrders: number;
    lowStockProducts: number;
}

export interface SellerProductFilters {
    status?: 'active' | 'inactive' | 'all';
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
    categoryId?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
}

// ============================================
// SELLER AUTHENTICATION & PROFILE
// ============================================

/**
 * Register a new seller account
 */
export async function registerSeller(
    data: SellerRegistration,
    userId?: string
): Promise<{ seller: Seller | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { seller: null, error: 'Supabase not configured' };
    }

    try {
        const insertData: Insertable<'sellers'> = {
            user_id: userId || null,
            business_name: data.businessName,
            business_email: data.businessEmail,
            business_phone: data.businessPhone,
            gst_number: data.gstNumber || null,
            pan_number: data.panNumber || null,
            address: data.address || null,
            city: data.city || null,
            state: data.state || null,
            pincode: data.pincode || null,
            is_verified: false,
            is_active: true,
        };

        const { data: seller, error } = await getSupabase()
            .from('sellers')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return { seller, error: null };
    } catch (err: any) {
        console.error('Error registering seller:', err);
        return { seller: null, error: err.message || 'Registration failed' };
    }
}

/**
 * Get seller profile by user ID
 */
export async function getSellerByUserId(
    userId: string
): Promise<Seller | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await getSupabase()
            .from('sellers')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching seller:', err);
        return null;
    }
}

/**
 * Get seller by ID
 */
export async function getSellerById(sellerId: string): Promise<Seller | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await getSupabase()
            .from('sellers')
            .select('*')
            .eq('id', sellerId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching seller:', err);
        return null;
    }
}

/**
 * Update seller profile
 */
export async function updateSellerProfile(
    sellerId: string,
    updates: Updateable<'sellers'>
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('sellers')
            .update(updates)
            .eq('id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error updating seller:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// SELLER STATISTICS
// ============================================

/**
 * Get seller dashboard statistics
 */
export async function getSellerStats(sellerId: string): Promise<SellerStats> {
    const defaultStats: SellerStats = {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        pendingOrders: 0,
        lowStockProducts: 0,
    };

    if (!isSupabaseConfigured()) return defaultStats;

    try {
        // Get seller base stats
        const { data: seller } = await getSupabase()
            .from('sellers')
            .select('total_products, total_orders, total_revenue, average_rating')
            .eq('id', sellerId)
            .single();

        // Get pending orders count
        const { count: pendingOrders } = await getSupabase()
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', sellerId)
            .in('item_status', ['pending', 'confirmed', 'processing']);

        // Get low stock products count
        const { data: lowStockData } = await getSupabase()
            .from('seller_products_view')
            .select('id')
            .eq('seller_id', sellerId)
            .eq('stock_status', 'low_stock');

        return {
            totalProducts: seller?.total_products || 0,
            totalOrders: seller?.total_orders || 0,
            totalRevenue: seller?.total_revenue || 0,
            averageRating: seller?.average_rating || 0,
            pendingOrders: pendingOrders || 0,
            lowStockProducts: lowStockData?.length || 0,
        };
    } catch (err) {
        console.error('Error fetching seller stats:', err);
        return defaultStats;
    }
}

// ============================================
// SELLER PRODUCT MANAGEMENT
// ============================================

/**
 * Get products for a seller
 */
export async function getSellerProducts(
    sellerId: string,
    filters: SellerProductFilters = {}
): Promise<DbProduct[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        let query = getSupabase()
            .from('seller_products_view')
            .select('*')
            .eq('seller_id', sellerId);

        // Apply filters
        if (filters.status === 'active') {
            query = query.eq('is_active', true);
        } else if (filters.status === 'inactive') {
            query = query.eq('is_active', false);
        }

        if (filters.stockStatus) {
            query = query.eq('stock_status', filters.stockStatus);
        }

        if (filters.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }

        if (filters.searchQuery) {
            query = query.or(
                `name.ilike.%${filters.searchQuery}%,brand.ilike.%${filters.searchQuery}%`
            );
        }

        // Pagination
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        query = query.range(offset, offset + limit - 1);

        // Order by creation date
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching seller products:', err);
        return [];
    }
}

/**
 * Create a new product for a seller
 */
export async function createSellerProduct(
    sellerId: string,
    productData: Insertable<'products'>
): Promise<{ product: DbProduct | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { product: null, error: 'Supabase not configured' };
    }

    try {
        const dataWithSeller = {
            ...productData,
            seller_id: sellerId,
        };

        const { data: product, error } = await getSupabase()
            .from('products')
            .insert(dataWithSeller)
            .select()
            .single();

        if (error) throw error;

        // Update seller's product count
        await getSupabase().rpc('increment_seller_products', { seller_id: sellerId });

        return { product, error: null };
    } catch (err: any) {
        console.error('Error creating product:', err);
        return { product: null, error: err.message };
    }
}

/**
 * Update a seller's product
 */
export async function updateSellerProduct(
    sellerId: string,
    productId: string,
    updates: Updateable<'products'>
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('products')
            .update(updates)
            .eq('id', productId)
            .eq('seller_id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error updating product:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Delete a seller's product (soft delete)
 */
export async function deleteSellerProduct(
    sellerId: string,
    productId: string
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('products')
            .update({ is_active: false })
            .eq('id', productId)
            .eq('seller_id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error deleting product:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// SELLER ORDERS
// ============================================

/**
 * Get orders for a seller's products
 */
export async function getSellerOrders(
    sellerId: string,
    status?: string,
    limit = 20,
    offset = 0
): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
        let query = getSupabase()
            .from('order_items')
            .select(
                `
        *,
        orders (
          id,
          order_number,
          user_id,
          status,
          delivery_name,
          delivery_phone,
          delivery_address,
          delivery_city,
          delivery_state,
          delivery_pincode,
          created_at
        )
      `
            )
            .eq('seller_id', sellerId);

        if (status && status !== 'all') {
            query = query.eq('item_status', status);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching seller orders:', err);
        return [];
    }
}

/**
 * Update order item status (for seller fulfillment)
 */
export async function updateOrderItemStatus(
    sellerId: string,
    orderItemId: string,
    status: string,
    trackingInfo?: { trackingNumber?: string; carrier?: string }
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const updates: any = {
            item_status: status,
        };

        if (trackingInfo?.trackingNumber) {
            updates.tracking_number = trackingInfo.trackingNumber;
        }
        if (trackingInfo?.carrier) {
            updates.carrier = trackingInfo.carrier;
        }
        if (status === 'delivered') {
            updates.delivered_at = new Date().toISOString();
        }

        const { error } = await getSupabase()
            .from('order_items')
            .update(updates)
            .eq('id', orderItemId)
            .eq('seller_id', sellerId);

        if (error) throw error;

        // Add timeline entry
        await getSupabase().from('order_item_timeline').insert({
            order_item_id: orderItemId,
            status,
            title: getStatusTitle(status),
        });

        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error updating order status:', err);
        return { success: false, error: err.message };
    }
}

function getStatusTitle(status: string): string {
    const titles: Record<string, string> = {
        confirmed: 'Order Confirmed',
        processing: 'Order Processing',
        shipped: 'Order Shipped',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Order Delivered',
        cancelled: 'Order Cancelled',
    };
    return titles[status] || status;
}

// ============================================
// SELLER VERIFICATION
// ============================================

/**
 * Submit verification documents
 */
export async function submitVerificationDocuments(
    sellerId: string,
    documentUrls: string[]
): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { error } = await getSupabase()
            .from('sellers')
            .update({ verification_documents: documentUrls })
            .eq('id', sellerId);

        if (error) throw error;
        return { success: true, error: null };
    } catch (err: any) {
        console.error('Error submitting verification docs:', err);
        return { success: false, error: err.message };
    }
}

export const sellerService = {
    registerSeller,
    getSellerByUserId,
    getSellerById,
    updateSellerProfile,
    getSellerStats,
    getSellerProducts,
    createSellerProduct,
    updateSellerProduct,
    deleteSellerProduct,
    getSellerOrders,
    updateOrderItemStatus,
    submitVerificationDocuments,
};

export default sellerService;
