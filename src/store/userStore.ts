import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Address, Order } from '../types';

// Clear in-memory and persisted data for bag and wishlist stores
// Note: We use require() to avoid circular dependencies since this file is imported by the stores
const clearAllStores = () => {
  try {
    // Clear in-memory state first
    const { useBagStore } = require('./bagStore');
    const { useWishlistStore } = require('./wishlistStore');

    // Clear the in-memory state
    useBagStore.getState().clearBag();
    useWishlistStore.getState().clearWishlist();

    // Also clear the persisted storage to ensure clean state on next app start
    AsyncStorage.removeItem('bag-storage');
    AsyncStorage.removeItem('wishlist-storage');
  } catch (error) {
    console.error('Error clearing stores:', error);
  }
};

interface UserState {
  user: User | null;
  addresses: Address[];
  orders: Order[];
  isLoggedIn: boolean;
  isHydrated: boolean;

  // Auth actions
  login: (user: User) => void;
  logout: () => void;
  clearAllUserData: () => void;
  updateProfile: (updates: Partial<User>) => void;
  setHydrated: (state: boolean) => void;

  // Address actions
  addAddress: (address: Address) => void;
  updateAddress: (addressId: string, updates: Partial<Address>) => void;
  removeAddress: (addressId: string) => void;
  setDefaultAddress: (addressId: string) => void;
  getDefaultAddress: () => Address | undefined;

  // Order actions
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      addresses: [],
      orders: [],
      isLoggedIn: false,
      isHydrated: false,

      // Auth
      login: (user) => {
        const currentUser = get().user;
        // If logging in as a different user, clear previous user's data first
        if (currentUser && currentUser.id !== user.id) {
          // Clear local state
          set({
            orders: [],
            addresses: [],
          });
          // Clear persisted bag and wishlist
          clearAllStores();
        }
        set({ user, isLoggedIn: true });
      },

      logout: () => {
        // Clear all persisted stores (bag, wishlist)
        clearAllStores();
        set({
          user: null,
          isLoggedIn: false,
          orders: [],      // Clear orders on logout
          addresses: [],   // Clear addresses on logout
        });
      },

      clearAllUserData: () => {
        // Clear all persisted stores (bag, wishlist)
        clearAllStores();
        set({
          user: null,
          isLoggedIn: false,
          orders: [],
          addresses: [],
        });
      },

      updateProfile: (updates) =>
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      // Addresses
      addAddress: (address) =>
        set(state => ({
          addresses: [...state.addresses, address],
        })),

      updateAddress: (addressId, updates) =>
        set(state => ({
          addresses: state.addresses.map(addr =>
            addr.id === addressId ? { ...addr, ...updates } : addr
          ),
        })),

      removeAddress: (addressId) =>
        set(state => ({
          addresses: state.addresses.filter(addr => addr.id !== addressId),
        })),

      setDefaultAddress: (addressId) =>
        set(state => ({
          addresses: state.addresses.map(addr => ({
            ...addr,
            isDefault: addr.id === addressId,
          })),
        })),

      getDefaultAddress: () => {
        return get().addresses.find(addr => addr.isDefault) || get().addresses[0];
      },

      // Orders
      addOrder: (order) =>
        set(state => ({
          orders: [order, ...state.orders],
        })),

      updateOrderStatus: (orderId, status) =>
        set(state => ({
          orders: state.orders.map(order =>
            order.id === orderId ? { ...order, status } : order
          ),
        })),

      getOrderById: (orderId) => {
        return get().orders.find(order => order.id === orderId);
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
