// Core Domain Types for Myntra Clone

// Product attributes key-value structure
export interface ProductAttributes {
  [key: string]: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  ratingCount: number;
  images: string[];
  sizes: Size[];
  colors: Color[];
  description: string;
  categoryId: string;
  subcategoryId: string;
  tags: string[];
  inStock: boolean;
  deliveryDays: number;
  // Structured product information (Phase 1 - Step 1)
  highlights?: string[];           // ["100% Cotton", "Machine washable", ...]
  attributes?: ProductAttributes;  // {"Material": "Cotton", "Fit": "Regular", ...}
  sellerName?: string;             // Seller/store name for display
}

export interface Size {
  label: string;
  available: boolean;
}

export interface Color {
  name: string;
  hex: string;
  available: boolean;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  link?: string;
  categoryId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface WishlistItem {
  product: Product;
  addedAt: number;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  pincode: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  isDefault: boolean;
  type: 'home' | 'work' | 'other';
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  discount: number;
  deliveryCharge: number;
  address: Address;
  status: OrderStatus;
  createdAt: number;
  estimatedDelivery: number;
  paymentMethod: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
}

export interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: [number, number];
  sizes: string[];
  colors: string[];
  ratings: number[];
  discount: number;
  sortBy: SortOption;
}

export type SortOption =
  | 'popularity'
  | 'price_low_high'
  | 'price_high_low'
  | 'newest'
  | 'rating'
  | 'discount';

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  ProductDetails: { productId: string };
  Search: { query?: string };
  Filter: undefined;
  Sort: undefined;
  SizeChart: { productId: string };
  AddAddress: { addressId?: string };
  Checkout: undefined;
  OrderSuccess: { orderId: string };
  OrderDetails: { orderId: string };
  ProfileStack: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  SearchTab: undefined;
  WishlistTab: undefined;
  BagTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ProductList: { categoryId?: string; subcategoryId?: string; title: string };
  ProductDetails: { productId: string };
};

export type CategoriesStackParamList = {
  Categories: undefined;
  CategoryLanding: { categoryId: string };
  ProductList: { categoryId?: string; subcategoryId?: string; title: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Orders: undefined;
  OrderDetails: { orderId: string };
  WriteReview: {
    productId: string;
    orderId: string;
    productName: string;
    imageUrl: string;
    existingReview?: {
      id: string;
      rating: number;
      title?: string | null;
      comment?: string | null;
      images?: string[] | null;
    };
  };
  Addresses: undefined;
  AddAddress: { addressId?: string };
  Settings: undefined;
  Coupons: undefined;
  Bag: undefined;
  Checkout: undefined;
};
