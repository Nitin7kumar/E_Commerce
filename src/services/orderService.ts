import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { Order, CartItem, Address, OrderStatus } from '../types';
import { productService } from './productService';

export interface CreateOrderData {
  items: CartItem[];
  address: Address;
  paymentMethod: 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  totalAmount: number;
}

export interface OrderResult {
  success: boolean;
  order?: Order;
  orderId?: string;
  error?: string;
}

// =====================================================
// ACTUAL DATABASE SCHEMA (verified via Supabase OpenAPI):
// =====================================================
//
// orders:
//   id, user_id, order_number, address_id,
//   delivery_name, delivery_phone, delivery_address,
//   delivery_city, delivery_state, delivery_pincode,
//   status, payment_method, payment_status,
//   subtotal, discount_amount, delivery_charge, total_amount,
//   estimated_delivery, delivered_at, cancelled_at, cancellation_reason,
//   created_at, updated_at
//
// order_items:
//   id, order_id, product_id, product_name, product_brand, product_image,
//   size_label, color_name, color_hex,
//   unit_price, quantity, total_price,
//   created_at
//
// addresses:
//   id, user_id, name, phone,
//   address_line_1, address_line_2, city, state, pincode,
//   type, is_default, created_at, updated_at
// =====================================================

// Transform DB order to app Order type
const dbOrderToAppOrder = (dbOrder: any, items: any[], addressData?: any): Order => {
  const orderItems: CartItem[] = items.map(item => ({
    product: {
      id: item.product_id || '',
      name: item.product_name || 'Product',
      brand: item.product_brand || '',
      price: parseFloat(item.unit_price || 0),
      originalPrice: parseFloat(item.unit_price || 0),
      discount: 0,
      rating: 0,
      ratingCount: 0,
      images: item.product_image ? [item.product_image] : [],
      sizes: [{ label: item.size_label || 'One Size', available: true }],
      colors: [{ name: item.color_name || 'Default', hex: item.color_hex || '#000000', available: true }],
      description: '',
      categoryId: '',
      subcategoryId: '',
      tags: [],
      inStock: true,
      deliveryDays: 5,
    },
    quantity: item.quantity || 1,
    selectedSize: item.size_label || '',
    selectedColor: item.color_name || '',
  }));

  // Build address - prefer linked address record, fall back to delivery_* columns on order
  const address: Address = addressData ? {
    id: addressData.id || '',
    name: addressData.name || 'Delivery Address',
    phone: addressData.phone || '',
    pincode: addressData.pincode || '',
    address: addressData.address_line_1 || '',
    locality: addressData.address_line_2 || '',
    city: addressData.city || '',
    state: addressData.state || '',
    isDefault: addressData.is_default || false,
    type: addressData.type || 'home',
  } : {
    // Fall back to delivery fields stored directly on the order
    id: '',
    name: dbOrder.delivery_name || 'Delivery Address',
    phone: dbOrder.delivery_phone || '',
    pincode: dbOrder.delivery_pincode || '',
    address: dbOrder.delivery_address || '',
    locality: '',
    city: dbOrder.delivery_city || '',
    state: dbOrder.delivery_state || '',
    isDefault: false,
    type: 'home',
  };

  const paymentMethodMap: Record<string, string> = {
    cod: 'Cash on Delivery',
    upi: 'UPI',
    card: 'Credit/Debit Card',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
  };

  return {
    id: dbOrder.id,
    items: orderItems,
    totalAmount: parseFloat(dbOrder.total_amount || 0),
    discount: parseFloat(dbOrder.discount_amount || 0),
    deliveryCharge: parseFloat(dbOrder.delivery_charge || 0),
    address,
    status: (dbOrder.status || 'pending') as OrderStatus,
    createdAt: dbOrder.created_at ? new Date(dbOrder.created_at).getTime() : Date.now(),
    estimatedDelivery: dbOrder.estimated_delivery
      ? new Date(dbOrder.estimated_delivery).getTime()
      : Date.now() + 5 * 24 * 60 * 60 * 1000,
    paymentMethod: paymentMethodMap[dbOrder.payment_method] || dbOrder.payment_method || 'Cash on Delivery',
  };
};

export const orderService = {
  /**
   * Generate a unique order number
   */
  generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
  },

  /**
   * Create a new order
   * Matches ACTUAL database schema with all required columns
   */
  async createOrder(data: CreateOrderData): Promise<OrderResult> {
    try {
      console.log('📦 OrderService: Starting order creation...');

      let supabase;
      try {
        supabase = getSupabase();
      } catch (e) {
        console.error('📦 OrderService: Failed to get Supabase client:', e);
        return { success: false, error: 'Supabase not configured' };
      }

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('📦 OrderService: User ID:', user?.id || 'null');

      if (!user) {
        return {
          success: false,
          error: 'Not authenticated. Please log out and sign in again.',
        };
      }

      // Validate address_id (only use if it's a valid UUID)
      let validAddressId: string | null = null;
      if (data.address.id && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(data.address.id)) {
        validAddressId = data.address.id;
      }

      // Map payment method
      const paymentMethodMap: Record<string, string> = {
        cod: 'cod',
        upi: 'upi',
        card: 'card',
        netbanking: 'netbanking',
        wallet: 'wallet',
      };

      // Build order insert matching ALL required columns in the actual DB
      const orderInsert = {
        user_id: user.id,
        order_number: this.generateOrderNumber(),
        address_id: validAddressId,
        // Delivery address fields (required by DB)
        delivery_name: data.address.name,
        delivery_phone: data.address.phone,
        delivery_address: [data.address.address, data.address.locality].filter(Boolean).join(', '),
        delivery_city: data.address.city,
        delivery_state: data.address.state,
        delivery_pincode: data.address.pincode,
        // Payment & pricing (required by DB)
        payment_method: paymentMethodMap[data.paymentMethod] || 'cod',
        payment_status: 'pending',
        subtotal: data.subtotal,
        discount_amount: data.discount,
        delivery_charge: data.deliveryCharge,
        total_amount: data.totalAmount,
        // Status
        status: 'confirmed',
        // Estimated delivery (5 days from now)
        estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };

      console.log('📦 OrderService: Inserting order:', JSON.stringify(orderInsert, null, 2));

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsert as any)
        .select()
        .single();

      console.log('📦 OrderService: Order ID:', order?.id || 'null');
      if (orderError) {
        console.error('📦 OrderService: Order insert error:', JSON.stringify(orderError, null, 2));
        return { success: false, error: orderError.message };
      }

      if (!order) {
        return { success: false, error: 'Failed to create order - no data returned' };
      }

      // Build order_items matching ALL required columns in the actual DB
      const orderItems = data.items.map(item => {
        const isValidUUID = item.product.id && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(item.product.id);
        return {
          order_id: order.id,
          product_id: isValidUUID ? item.product.id : null,
          product_name: item.product.name,
          product_brand: item.product.brand || null,
          product_image: item.product.images?.[0] || null,
          size_label: item.selectedSize || null,
          color_name: item.selectedColor || null,
          color_hex: null,
          unit_price: item.product.price,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
        };
      });

      console.log('📦 OrderService: Inserting', orderItems.length, 'order items');

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems as any);

      if (itemsError) {
        console.error('📦 OrderService: Items insert error:', JSON.stringify(itemsError, null, 2));
        // Rollback order if items fail
        await supabase.from('orders').delete().eq('id', order.id);
        return { success: false, error: 'Failed to create order items: ' + itemsError.message };
      }

      // Fetch complete order with items for return
      const { data: completeItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      // Fetch linked address
      let addressData = null;
      if (order.address_id) {
        const { data: addr } = await supabase
          .from('addresses')
          .select('*')
          .eq('id', order.address_id)
          .single();
        addressData = addr;
      }

      console.log('📦 OrderService: Order created successfully! ID:', order.id);

      // Decrement stock for each item
      for (const item of data.items) {
        if (item.product.id) {
          await productService.updateStock(item.product.id, -item.quantity);
        }
      }

      return {
        success: true,
        orderId: order.id,
        order: dbOrderToAppOrder(order, completeItems || [], addressData),
      };
    } catch (error) {
      console.error('📦 OrderService: Exception:', error);
      return { success: false, error: 'Unexpected error: ' + (error as Error).message };
    }
  },

  /**
   * Get all orders for the current user
   */
  async getOrders(): Promise<{ orders: Order[]; error?: string }> {
    try {
      console.log('📦 OrderService.getOrders: Fetching orders...');

      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return { orders: [], error: 'Not authenticated' };
      }

      const { data: orders, error } = await getSupabase()
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('📦 OrderService.getOrders: Found', orders?.length || 0, 'orders');

      if (error) {
        console.error('📦 OrderService.getOrders: Error:', error.message);
        return { orders: [], error: error.message };
      }

      if (!orders || orders.length === 0) {
        return { orders: [] };
      }

      // Fetch items for all orders
      const orderIds = orders.map(o => o.id);
      const { data: allItems } = await getSupabase()
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      console.log('📦 OrderService.getOrders: Found', allItems?.length || 0, 'items');

      // Fetch linked addresses
      const addressIds = orders.map(o => o.address_id).filter(Boolean);
      let addressMap: Record<string, any> = {};

      if (addressIds.length > 0) {
        const { data: addresses } = await getSupabase()
          .from('addresses')
          .select('*')
          .in('id', addressIds);

        if (addresses) {
          addressMap = addresses.reduce((acc: Record<string, any>, addr: any) => {
            acc[addr.id] = addr;
            return acc;
          }, {});
        }
      }

      const appOrders: Order[] = orders.map(order => {
        const items = (allItems || []).filter((item: any) => item.order_id === order.id);
        const addressData = order.address_id ? addressMap[order.address_id] : null;
        return dbOrderToAppOrder(order, items, addressData);
      });

      return { orders: appOrders };
    } catch (error) {
      console.error('📦 OrderService.getOrders: Exception:', error);
      return { orders: [], error: 'Failed to fetch orders' };
    }
  },

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: string): Promise<{ order?: Order; error?: string }> {
    try {
      const { data: order, error } = await getSupabase()
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return { error: error?.message || 'Order not found' };
      }

      const { data: items } = await getSupabase()
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      let addressData = null;
      if (order.address_id) {
        const { data: address } = await getSupabase()
          .from('addresses')
          .select('*')
          .eq('id', order.address_id)
          .single();
        addressData = address;
      }

      return { order: dbOrderToAppOrder(order, items || [], addressData) };
    } catch (error) {
      return { error: 'Failed to fetch order' };
    }
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await getSupabase()
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        } as any)
        .eq('id', orderId)
        .in('status', ['pending', 'confirmed', 'processing']);

      if (error) {
        return { success: false, error: error.message };
      }

      // Increment stock for cancelled items
      const { data: items } = await getSupabase()
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (items) {
        for (const item of items) {
          if (item.product_id) {
            await productService.updateStock(item.product_id, item.quantity);
          }
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to cancel order' };
    }
  },

  /**
   * Track order status updates
   */
  subscribeToOrderUpdates(orderId: string, callback: (order: any) => void) {
    return getSupabase()
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },
};
