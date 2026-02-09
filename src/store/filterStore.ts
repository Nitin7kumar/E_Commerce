import { create } from 'zustand';
import { FilterState, SortOption } from '../types';

interface FilterStoreState extends FilterState {
  // Actions
  setCategories: (categories: string[]) => void;
  setBrands: (brands: string[]) => void;
  setPriceRange: (range: [number, number]) => void;
  setSizes: (sizes: string[]) => void;
  setColors: (colors: string[]) => void;
  setRatings: (ratings: number[]) => void;
  setDiscount: (discount: number) => void;
  setSortBy: (sortBy: SortOption) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
}

const initialState: FilterState = {
  categories: [],
  brands: [],
  priceRange: [0, 10000],
  sizes: [],
  colors: [],
  ratings: [],
  discount: 0,
  sortBy: 'popularity',
};

export const useFilterStore = create<FilterStoreState>((set, get) => ({
  ...initialState,

  setCategories: (categories) => set({ categories }),
  setBrands: (brands) => set({ brands }),
  setPriceRange: (priceRange) => set({ priceRange }),
  setSizes: (sizes) => set({ sizes }),
  setColors: (colors) => set({ colors }),
  setRatings: (ratings) => set({ ratings }),
  setDiscount: (discount) => set({ discount }),
  setSortBy: (sortBy) => set({ sortBy }),

  resetFilters: () => set(initialState),

  hasActiveFilters: () => {
    const state = get();
    return (
      state.categories.length > 0 ||
      state.brands.length > 0 ||
      state.priceRange[0] > 0 ||
      state.priceRange[1] < 10000 ||
      state.sizes.length > 0 ||
      state.colors.length > 0 ||
      state.ratings.length > 0 ||
      state.discount > 0
    );
  },
}));
