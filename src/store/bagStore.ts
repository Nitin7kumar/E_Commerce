/**
 * Bag Store with Supabase Sync
 * 
 * This store manages the shopping cart with:
 * - Local state for instant UI updates (optimistic)
 * - Supabase sync for persistence
 * - Automatic data fetch on app load
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { getSupabase, isSupabaseConfigured } from '../config/supabase';

interface BagState {
  items: CartItem[];
  cartId: string | null;
  isHydrated: boolean;
  isSyncing: boolean;
  syncError: string | null;

  // Actions
  addItem: (product: Product, size: string, color: string) => Promise<void>;
  removeItem: (productId: string, size: string, color: string) => Promise<void>;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => Promise<void>;
  clearBag: () => Promise<void>;
  setHydrated: (state: boolean) => void;
  syncWithSupabase: () => Promise<void>;

  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getTotalDiscount: () => number;
  getItemByProduct: (productId: string, size: string, color: string) => CartItem | undefined;
}

export const useBagStore = create<BagState>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      isHydrated: false,
      isSyncing: false,
      syncError: null,

      // ========================================
      // SYNC WITH SUPABASE - Fetch cart on load
      // ========================================
      syncWithSupabase: async () => {
        if (!isSupabaseConfigured()) {
          console.log('[BagStore] Supabase not configured, using local storage only');
          return;
        }

        const supabase = getSupabase();

        try {
          set({ isSyncing: true, syncError: null });

          // Get current user
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            console.log('[BagStore] No authenticated user, using local storage');
            set({ isSyncing: false });
            return;
          }

          // Find or create cart
          let { data: cart, error: cartError } = await supabase
            .from('carts')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

          if (cartError && cartError.code !== 'PGRST116') {
            // PGRST116 = no rows returned (cart doesn't exist)
            throw cartError;
          }

          if (!cart) {
            // Create new cart
            const { data: newCart, error: createError } = await supabase
              .from('carts')
              .insert({ user_id: user.id, status: 'active' })
              .select('id')
              .single();

            if (createError) throw createError;
            cart = newCart;
          }

          set({ cartId: cart.id });

          // Fetch cart items with product data
          // NOTE: Using actual DB column names from products table
          const { data: cartItems, error: itemsError } = await supabase
            .from('cart_items')
            .select(`
              id,
              quantity,
              selected_size,
              selected_color,
              product_id,
              products (
                id,
                name,
                description,
                price,
                mrp,
                discount_percent,
                image_url,
                images,
                sizes,
                colors,
                brand_name,
                category,
                stock,
                is_active
              )
            `)
            .eq('cart_id', cart.id);

          if (itemsError) {
            console.error('[BagStore] Cart items fetch error:', itemsError.message);
            throw itemsError;
          }

          // Transform DB items to app format
          const items: CartItem[] = (cartItems || [])
            .filter(item => item.products) // Only items with valid products
            .map(item => {
              const prod = item.products as any; // Type assertion for joined data
              // Build images array - use images array if available, else fallback to image_url
              const imagesArray = prod.images?.length > 0
                ? prod.images
                : (prod.image_url ? [prod.image_url] : []);

              // Calculate discount from mrp and price
              const mrp = prod.mrp || prod.price;
              const discount = prod.discount_percent || (mrp > prod.price ? Math.round((1 - prod.price / mrp) * 100) : 0);

              return {
                product: {
                  id: prod.id,
                  name: prod.name,
                  description: prod.description || '',
                  price: prod.price,
                  originalPrice: mrp,
                  discount: discount,
                  images: imagesArray,
                  sizes: (prod.sizes || []).map((s: string) => ({ label: s, available: true })),
                  colors: (prod.colors || []).map((c: any) =>
                    typeof c === 'string'
                      ? { name: c, hex: '#000', available: true }
                      : { name: c.name, hex: c.hex || '#000', available: true }
                  ),
                  brand: prod.brand_name || 'Store Brand',
                  categoryId: prod.category || '',
                  subcategoryId: '',
                  tags: [],
                  inStock: prod.stock > 0 && prod.is_active !== false,
                  deliveryDays: 5,
                  rating: 0,
                  ratingCount: 0,
                },
                quantity: item.quantity,
                selectedSize: item.selected_size || 'One Size',
                selectedColor: item.selected_color || 'Default',
              };
            });

          set({ items, isSyncing: false });
          console.log(`[BagStore] Synced ${items.length} items from Supabase`);

        } catch (error) {
          console.error('[BagStore] Sync error:', error);
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : 'Sync failed'
          });
        }
      },

      // ========================================
      // ADD ITEM - Optimistic update + Supabase
      // ========================================
      addItem: async (product, size, color) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => {
          const existingIndex = state.items.findIndex(
            item =>
              item.product.id === product.id &&
              item.selectedSize === size &&
              item.selectedColor === color
          );

          if (existingIndex >= 0) {
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + 1,
            };
            return { items: newItems };
          }

          return {
            items: [
              ...state.items,
              { product, quantity: 1, selectedSize: size, selectedColor: color },
            ],
          };
        });

        // Sync to Supabase
        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.log('[BagStore] No user, item saved locally only');
            return;
          }

          let cartId = get().cartId;

          // Ensure cart exists
          if (!cartId) {
            const { data: cart, error: cartError } = await supabase
              .from('carts')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .single();

            if (cartError && cartError.code !== 'PGRST116') throw cartError;

            if (cart) {
              cartId = cart.id;
            } else {
              const { data: newCart, error: createError } = await supabase
                .from('carts')
                .insert({ user_id: user.id, status: 'active' })
                .select('id')
                .single();

              if (createError) throw createError;
              cartId = newCart.id;
            }

            set({ cartId });
          }

          // Check if item already exists in cart
          const { data: existingItem } = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('cart_id', cartId)
            .eq('product_id', product.id)
            .eq('selected_size', size)
            .eq('selected_color', color)
            .single();

          if (existingItem) {
            // Update quantity
            await supabase
              .from('cart_items')
              .update({ quantity: existingItem.quantity + 1 })
              .eq('id', existingItem.id);
          } else {
            // Insert new item
            await supabase
              .from('cart_items')
              .insert({
                cart_id: cartId,
                product_id: product.id,
                quantity: 1,
                selected_size: size,
                selected_color: color,
              });
          }

          console.log('[BagStore] Item synced to Supabase');

        } catch (error) {
          console.error('[BagStore] Add item error:', error);
          // Rollback on error
          set({ items: previousItems });
        }
      },

      // ========================================
      // REMOVE ITEM
      // ========================================
      removeItem: async (productId, size, color) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
          items: state.items.filter(
            item =>
              !(item.product.id === productId &&
                item.selectedSize === size &&
                item.selectedColor === color)
          ),
        }));

        // Sync to Supabase
        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const cartId = get().cartId;

          if (!cartId) return;

          await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cartId)
            .eq('product_id', productId)
            .eq('selected_size', size)
            .eq('selected_color', color);

          console.log('[BagStore] Item removed from Supabase');

        } catch (error) {
          console.error('[BagStore] Remove item error:', error);
          set({ items: previousItems });
        }
      },

      // ========================================
      // UPDATE QUANTITY
      // ========================================
      updateQuantity: async (productId, size, color, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(productId, size, color);
          return;
        }

        const previousItems = get().items;

        // Optimistic update
        set(state => ({
          items: state.items.map(item =>
            item.product.id === productId &&
              item.selectedSize === size &&
              item.selectedColor === color
              ? { ...item, quantity }
              : item
          ),
        }));

        // Sync to Supabase
        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const cartId = get().cartId;

          if (!cartId) return;

          await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('cart_id', cartId)
            .eq('product_id', productId)
            .eq('selected_size', size)
            .eq('selected_color', color);

          console.log('[BagStore] Quantity updated in Supabase');

        } catch (error) {
          console.error('[BagStore] Update quantity error:', error);
          set({ items: previousItems });
        }
      },

      // ========================================
      // CLEAR BAG
      // ========================================
      clearBag: async () => {
        const previousItems = get().items;

        set({ items: [] });

        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const cartId = get().cartId;

          if (!cartId) return;

          await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cartId);

          console.log('[BagStore] Cart cleared in Supabase');

        } catch (error) {
          console.error('[BagStore] Clear bag error:', error);
          set({ items: previousItems });
        }
      },

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      // ========================================
      // COMPUTED VALUES
      // ========================================
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
      },

      getTotalDiscount: () => {
        return get().items.reduce(
          (sum, item) =>
            sum + (item.product.originalPrice - item.product.price) * item.quantity,
          0
        );
      },

      getItemByProduct: (productId, size, color) => {
        return get().items.find(
          item =>
            item.product.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
        );
      },
    }),
    {
      name: 'bag-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        // Sync with Supabase after hydration
        setTimeout(() => {
          state?.syncWithSupabase();
        }, 500);
      },
    }
  )
);
