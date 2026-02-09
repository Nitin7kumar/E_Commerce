/**
 * Wishlist Store with Supabase Sync
 * 
 * This store manages the wishlist with:
 * - Local state for instant UI updates (optimistic)
 * - Supabase sync for persistence
 * - Automatic data fetch on app load
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WishlistItem, Product } from '../types';
import { getSupabase, isSupabaseConfigured } from '../config/supabase';

interface WishlistState {
  items: WishlistItem[];
  isHydrated: boolean;
  isSyncing: boolean;
  syncError: string | null;

  // Actions
  addItem: (product: Product) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItem: (product: Product) => Promise<void>;
  clearWishlist: () => Promise<void>;
  setHydrated: (state: boolean) => void;
  syncWithSupabase: () => Promise<void>;

  // Queries
  isInWishlist: (productId: string) => boolean;
  getItemCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      isSyncing: false,
      syncError: null,

      // ========================================
      // SYNC WITH SUPABASE - Fetch wishlist on load
      // ========================================
      syncWithSupabase: async () => {
        if (!isSupabaseConfigured()) {
          console.log('[WishlistStore] Supabase not configured, using local storage only');
          return;
        }

        const supabase = getSupabase();

        try {
          set({ isSyncing: true, syncError: null });

          // Get current user
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user) {
            console.log('[WishlistStore] No authenticated user, using local storage');
            set({ isSyncing: false });
            return;
          }

          // Fetch wishlist items with product data
          // NOTE: Using actual DB column names from products table
          const { data: wishlistItems, error: itemsError } = await supabase
            .from('wishlists')
            .select(`
              id,
              created_at,
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
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (itemsError) {
            console.error('[WishlistStore] Wishlist fetch error:', itemsError.message);
            throw itemsError;
          }

          // Transform DB items to app format
          const items: WishlistItem[] = (wishlistItems || [])
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
                addedAt: new Date(item.created_at).getTime(),
              };
            });

          set({ items, isSyncing: false });
          console.log(`[WishlistStore] Synced ${items.length} items from Supabase`);

        } catch (error) {
          console.error('[WishlistStore] Sync error:', error);
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : 'Sync failed'
          });
        }
      },

      // ========================================
      // ADD ITEM - Optimistic update + Supabase
      // ========================================
      addItem: async (product) => {
        // Check if already in wishlist
        if (get().isInWishlist(product.id)) {
          return;
        }

        const previousItems = get().items;

        // Optimistic update
        set(state => ({
          items: [
            ...state.items,
            { product, addedAt: Date.now() },
          ],
        }));

        // Sync to Supabase
        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            console.log('[WishlistStore] No user, item saved locally only');
            return;
          }

          // Insert into wishlists table
          const { error } = await supabase
            .from('wishlists')
            .insert({
              user_id: user.id,
              product_id: product.id,
            });

          if (error) {
            // Check if it's a duplicate error (already in wishlist)
            if (error.code === '23505') {
              console.log('[WishlistStore] Item already in wishlist');
              return;
            }
            throw error;
          }

          console.log('[WishlistStore] Item added to Supabase');

        } catch (error) {
          console.error('[WishlistStore] Add item error:', error);
          // Rollback on error
          set({ items: previousItems });
        }
      },

      // ========================================
      // REMOVE ITEM
      // ========================================
      removeItem: async (productId) => {
        const previousItems = get().items;

        // Optimistic update
        set(state => ({
          items: state.items.filter(item => item.product.id !== productId),
        }));

        // Sync to Supabase
        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) return;

          await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);

          console.log('[WishlistStore] Item removed from Supabase');

        } catch (error) {
          console.error('[WishlistStore] Remove item error:', error);
          set({ items: previousItems });
        }
      },

      // ========================================
      // TOGGLE ITEM (Add/Remove)
      // ========================================
      toggleItem: async (product) => {
        const isInWishlist = get().isInWishlist(product.id);
        if (isInWishlist) {
          await get().removeItem(product.id);
        } else {
          await get().addItem(product);
        }
      },

      // ========================================
      // CLEAR WISHLIST
      // ========================================
      clearWishlist: async () => {
        const previousItems = get().items;

        set({ items: [] });

        if (!isSupabaseConfigured()) return;

        try {
          const supabase = getSupabase();
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) return;

          await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', user.id);

          console.log('[WishlistStore] Wishlist cleared in Supabase');

        } catch (error) {
          console.error('[WishlistStore] Clear wishlist error:', error);
          set({ items: previousItems });
        }
      },

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      // ========================================
      // QUERIES
      // ========================================
      isInWishlist: (productId) => {
        return get().items.some(item => item.product.id === productId);
      },

      getItemCount: () => get().items.length,
    }),
    {
      name: 'wishlist-storage',
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
