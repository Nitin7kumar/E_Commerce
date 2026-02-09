export { authService } from './authService';
export type { AuthResult, SignUpData, SignInData } from './authService';

export { productService, useProducts, useProduct, useProductsByCategory } from './productService';
export type { ProductsResult, ProductResult } from './productService';

export { orderService } from './orderService';
export type { CreateOrderData, OrderResult } from './orderService';

export { addressService } from './addressService';

export { sellerService } from './sellerService';
export type {
    SellerRegistration,
    SellerStats,
    SellerProductFilters,
} from './sellerService';

export { ratingService } from './ratingService';
export type { RatingSubmission, RatingFilters } from './ratingService';

export { returnReplaceService } from './returnReplaceService';
export type {
    RequestType,
    RequestStatus,
    RequestReason,
    ReturnReplaceSubmission,
    EligibilityCheck,
} from './returnReplaceService';

// New E-commerce Extension Services
export { cartService, useCart, useCartCount } from './cartService';
export type { CartItemWithProduct, CartResult } from './cartService';

export { wishlistService, useWishlist, useWishlistCount, useIsInWishlist } from './wishlistService';
export type { WishlistItemWithProduct, WishlistResult } from './wishlistService';

export { reviewService, useProductReviews, useUserReview } from './reviewService';
export type { ReviewWithUser, ReviewStats, CreateReviewData } from './reviewService';

export { categoryService, useCategories, useRootCategories, useSubCategories, useCategory } from './categoryService';
export type { CategoryWithChildren, DBCategory } from './categoryService';

export { couponService, useCouponValidation } from './couponService';
export type { AppliedCoupon, DBCoupon } from './couponService';
