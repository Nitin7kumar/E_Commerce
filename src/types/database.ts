// Auto-generated types for Supabase database schema
// Run `npx supabase gen types typescript` to regenerate after schema changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          phone: string | null;
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          phone?: string | null;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          phone?: string | null;
          profile_image_url?: string | null;
          updated_at?: string;
        };
      };
      sellers: {
        Row: {
          id: string;
          user_id: string | null;
          business_name: string;
          business_email: string;
          business_phone: string;
          gst_number: string | null;
          pan_number: string | null;
          bank_account_number: string | null;
          bank_ifsc: string | null;
          logo_url: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          commission_rate: number;
          is_verified: boolean;
          is_active: boolean;
          verification_documents: string[];
          total_products: number;
          total_orders: number;
          total_revenue: number;
          average_rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_name: string;
          business_email: string;
          business_phone: string;
          gst_number?: string | null;
          pan_number?: string | null;
          bank_account_number?: string | null;
          bank_ifsc?: string | null;
          logo_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          commission_rate?: number;
          is_verified?: boolean;
          is_active?: boolean;
          verification_documents?: string[];
          total_products?: number;
          total_orders?: number;
          total_revenue?: number;
          average_rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          business_email?: string;
          business_phone?: string;
          gst_number?: string | null;
          pan_number?: string | null;
          bank_account_number?: string | null;
          bank_ifsc?: string | null;
          logo_url?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          commission_rate?: number;
          is_verified?: boolean;
          is_active?: boolean;
          verification_documents?: string[];
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          image: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          image?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          category_id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          brand: string;
          description: string | null;
          category_id: string | null;
          subcategory_id: string | null;
          base_price: number;
          original_price: number | null;
          discount_percent: number;
          rating: number;
          rating_count: number;
          tags: string[];
          images: string[];
          delivery_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand: string;
          description?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          base_price: number;
          original_price?: number | null;
          discount_percent?: number;
          rating?: number;
          rating_count?: number;
          tags?: string[];
          images?: string[];
          delivery_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          brand?: string;
          description?: string | null;
          category_id?: string | null;
          subcategory_id?: string | null;
          base_price?: number;
          original_price?: number | null;
          discount_percent?: number;
          rating?: number;
          rating_count?: number;
          tags?: string[];
          images?: string[];
          delivery_days?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          size_label: string;
          color_name: string;
          color_hex: string;
          sku: string | null;
          price_adjustment: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          size_label: string;
          color_name: string;
          color_hex: string;
          sku?: string | null;
          price_adjustment?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          size_label?: string;
          color_name?: string;
          color_hex?: string;
          sku?: string | null;
          price_adjustment?: number;
          is_active?: boolean;
        };
      };
      inventory: {
        Row: {
          id: string;
          variant_id: string;
          quantity_available: number;
          low_stock_threshold: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          quantity_available?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
        Update: {
          quantity_available?: number;
          low_stock_threshold?: number;
          updated_at?: string;
        };
      };
      stock_movements: {
        Row: {
          id: string;
          variant_id: string;
          movement_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage' | 'transfer';
          quantity: number;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          movement_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage' | 'transfer';
          quantity: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          movement_type?: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage' | 'transfer';
          quantity?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          pincode: string;
          address: string;
          locality: string | null;
          city: string;
          state: string;
          type: 'home' | 'work' | 'other';
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          pincode: string;
          address: string;
          locality?: string | null;
          city: string;
          state: string;
          type?: 'home' | 'work' | 'other';
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          pincode?: string;
          address?: string;
          locality?: string | null;
          city?: string;
          state?: string;
          type?: 'home' | 'work' | 'other';
          is_default?: boolean;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          subtotal: number;
          discount_amount: number;
          delivery_charge: number;
          total_amount: number;
          payment_method: 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';
          payment_status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
          delivery_name: string;
          delivery_phone: string;
          delivery_address: string;
          delivery_city: string;
          delivery_state: string;
          delivery_pincode: string;
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
          estimated_delivery: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id: string;
          subtotal: number;
          discount_amount?: number;
          delivery_charge?: number;
          total_amount: number;
          payment_method?: 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';
          payment_status?: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
          delivery_name: string;
          delivery_phone: string;
          delivery_address: string;
          delivery_city: string;
          delivery_state: string;
          delivery_pincode: string;
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
          estimated_delivery?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subtotal?: number;
          discount_amount?: number;
          delivery_charge?: number;
          total_amount?: number;
          payment_method?: 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';
          payment_status?: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
          estimated_delivery?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          seller_id: string | null;
          product_name: string;
          product_brand: string;
          product_image: string | null;
          size_label: string | null;
          color_name: string | null;
          color_hex: string | null;
          unit_price: number;
          quantity: number;
          total_price: number;
          item_status: string;
          delivered_at: string | null;
          return_eligible_until: string | null;
          replace_eligible_until: string | null;
          tracking_number: string | null;
          carrier: string | null;
          is_rated: boolean;
          is_returnable: boolean;
          is_replaceable: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          seller_id?: string | null;
          product_name: string;
          product_brand: string;
          product_image?: string | null;
          size_label?: string | null;
          color_name?: string | null;
          color_hex?: string | null;
          unit_price: number;
          quantity?: number;
          total_price: number;
          item_status?: string;
          tracking_number?: string | null;
          carrier?: string | null;
          is_returnable?: boolean;
          is_replaceable?: boolean;
          created_at?: string;
        };
        Update: {
          quantity?: number;
          total_price?: number;
          item_status?: string;
          delivered_at?: string | null;
          return_eligible_until?: string | null;
          replace_eligible_until?: string | null;
          tracking_number?: string | null;
          carrier?: string | null;
          is_rated?: boolean;
        };
      };
      customer_ratings: {
        Row: {
          id: string;
          product_id: string;
          order_item_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          review_text: string | null;
          images: string[];
          is_verified_purchase: boolean;
          is_approved: boolean;
          is_featured: boolean;
          helpful_count: number;
          reported_count: number;
          seller_response: string | null;
          seller_responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          order_item_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          review_text?: string | null;
          images?: string[];
          is_verified_purchase?: boolean;
          is_approved?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          title?: string | null;
          review_text?: string | null;
          images?: string[];
          is_approved?: boolean;
          is_featured?: boolean;
          helpful_count?: number;
          reported_count?: number;
          seller_response?: string | null;
          seller_responded_at?: string | null;
          updated_at?: string;
        };
      };
      product_rating_summary: {
        Row: {
          id: string;
          product_id: string;
          average_rating: number;
          total_ratings: number;
          rating_1_count: number;
          rating_2_count: number;
          rating_3_count: number;
          rating_4_count: number;
          rating_5_count: number;
          total_reviews_with_text: number;
          total_reviews_with_images: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          average_rating?: number;
          total_ratings?: number;
          rating_1_count?: number;
          rating_2_count?: number;
          rating_3_count?: number;
          rating_4_count?: number;
          rating_5_count?: number;
          total_reviews_with_text?: number;
          total_reviews_with_images?: number;
          updated_at?: string;
        };
        Update: {
          average_rating?: number;
          total_ratings?: number;
          rating_1_count?: number;
          rating_2_count?: number;
          rating_3_count?: number;
          rating_4_count?: number;
          rating_5_count?: number;
          total_reviews_with_text?: number;
          total_reviews_with_images?: number;
          updated_at?: string;
        };
      };
      rating_helpful_votes: {
        Row: {
          id: string;
          rating_id: string;
          user_id: string;
          is_helpful: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          rating_id: string;
          user_id: string;
          is_helpful: boolean;
          created_at?: string;
        };
        Update: {
          is_helpful?: boolean;
        };
      };
      return_replace_requests: {
        Row: {
          id: string;
          request_number: string;
          order_id: string;
          order_item_id: string;
          user_id: string;
          seller_id: string | null;
          request_type: 'return' | 'replace';
          status: 'requested' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'inspection' | 'completed' | 'rejected' | 'cancelled';
          reason: 'damaged' | 'defective' | 'wrong_item' | 'wrong_size' | 'wrong_color' | 'quality_issue' | 'not_as_described' | 'missing_parts' | 'other';
          description: string | null;
          customer_images: string[];
          is_within_window: boolean;
          window_end_date: string | null;
          product_name: string | null;
          product_image: string | null;
          unit_price: number | null;
          quantity: number;
          refund_amount: number | null;
          refund_status: string | null;
          replacement_order_id: string | null;
          resolution_notes: string | null;
          pickup_address: string | null;
          pickup_city: string | null;
          pickup_pincode: string | null;
          pickup_scheduled_date: string | null;
          pickup_completed_at: string | null;
          courier_partner: string | null;
          pickup_tracking_number: string | null;
          inspection_notes: string | null;
          inspection_images: string[];
          inspected_by: string | null;
          inspected_at: string | null;
          requested_at: string;
          approved_at: string | null;
          completed_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_number?: string;
          order_id: string;
          order_item_id: string;
          user_id: string;
          seller_id?: string | null;
          request_type: 'return' | 'replace';
          status?: 'requested' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'inspection' | 'completed' | 'rejected' | 'cancelled';
          reason: 'damaged' | 'defective' | 'wrong_item' | 'wrong_size' | 'wrong_color' | 'quality_issue' | 'not_as_described' | 'missing_parts' | 'other';
          description?: string | null;
          customer_images?: string[];
          is_within_window: boolean;
          window_end_date?: string | null;
          product_name?: string | null;
          product_image?: string | null;
          unit_price?: number | null;
          quantity?: number;
          pickup_address?: string | null;
          pickup_city?: string | null;
          pickup_pincode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'requested' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'inspection' | 'completed' | 'rejected' | 'cancelled';
          description?: string | null;
          customer_images?: string[];
          refund_amount?: number | null;
          refund_status?: string | null;
          replacement_order_id?: string | null;
          resolution_notes?: string | null;
          pickup_address?: string | null;
          pickup_city?: string | null;
          pickup_pincode?: string | null;
          pickup_scheduled_date?: string | null;
          pickup_completed_at?: string | null;
          courier_partner?: string | null;
          pickup_tracking_number?: string | null;
          inspection_notes?: string | null;
          inspection_images?: string[];
          inspected_by?: string | null;
          inspected_at?: string | null;
          approved_at?: string | null;
          completed_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          updated_at?: string;
        };
      };
      return_replace_timeline: {
        Row: {
          id: string;
          request_id: string;
          status: 'requested' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'inspection' | 'completed' | 'rejected' | 'cancelled';
          title: string | null;
          notes: string | null;
          created_by: string | null;
          is_customer_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          status: 'requested' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'inspection' | 'completed' | 'rejected' | 'cancelled';
          title?: string | null;
          notes?: string | null;
          created_by?: string | null;
          is_customer_visible?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          notes?: string | null;
          is_customer_visible?: boolean;
        };
      };
      order_item_timeline: {
        Row: {
          id: string;
          order_item_id: string;
          status: string;
          title: string | null;
          location: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          status: string;
          title?: string | null;
          location?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          title?: string | null;
          location?: string | null;
          notes?: string | null;
        };
      };
    };
    Views: {
      products_with_inventory: {
        Row: {
          id: string;
          name: string;
          brand: string;
          description: string | null;
          category_id: string | null;
          subcategory_id: string | null;
          base_price: number;
          original_price: number | null;
          discount_percent: number;
          rating: number;
          rating_count: number;
          tags: string[];
          images: string[];
          delivery_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          category_name: string | null;
          subcategory_name: string | null;
          variants: Json;
        };
      };
    };
    Enums: {
      stock_movement_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage' | 'transfer';
      address_type: 'home' | 'work' | 'other';
      order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
      payment_status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
      payment_method: 'cod' | 'upi' | 'card' | 'netbanking' | 'wallet';
      request_type: 'return' | 'replace';
      request_status: 'requested' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'inspection' | 'completed' | 'rejected' | 'cancelled';
      request_reason: 'damaged' | 'defective' | 'wrong_item' | 'wrong_size' | 'wrong_color' | 'quality_issue' | 'not_as_described' | 'missing_parts' | 'other';
    };
  };
};

// Helper types for easier use
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updateable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Convenience aliases
export type Profile = Tables<'profiles'>;
export type Seller = Tables<'sellers'>;
export type Category = Tables<'categories'>;
export type Subcategory = Tables<'subcategories'>;
export type DbProduct = Tables<'products'>;
export type ProductVariant = Tables<'product_variants'>;
export type Inventory = Tables<'inventory'>;
export type StockMovement = Tables<'stock_movements'>;
export type DbAddress = Tables<'addresses'>;
export type DbOrder = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type CustomerRating = Tables<'customer_ratings'>;
export type ProductRatingSummary = Tables<'product_rating_summary'>;
export type RatingHelpfulVote = Tables<'rating_helpful_votes'>;
export type ReturnReplaceRequest = Tables<'return_replace_requests'>;
export type ReturnReplaceTimeline = Tables<'return_replace_timeline'>;
export type OrderItemTimeline = Tables<'order_item_timeline'>;
export type ProductWithInventory = Views<'products_with_inventory'>;
