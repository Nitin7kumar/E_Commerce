import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Image,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Price, Rating, Badge, CircularImageCarousel, ReviewModal } from '../../components';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList } from '../../types';
import { useProduct } from '../../services/productService';
import { useBagStore, useWishlistStore } from '../../store';
import { useProductReviews, ReviewWithUser, useCanReview } from '../../services/reviewService';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProductDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { productId } = route.params as { productId: string };

  // Fetch product from Supabase
  const { product, loading, error } = useProduct(productId);

  const { addItem, items: bagItems } = useBagStore();
  const { isInWishlist, toggleItem } = useWishlistStore();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [sizeError, setSizeError] = useState(false);
  const [addedToBag, setAddedToBag] = useState(false);

  // Bottom Sheet state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'bag'>('bag');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Fetch reviews for the product
  const { reviews, stats: reviewStats, refetch: refetchReviews, loading: reviewsLoading } = useProductReviews(productId);
  const { canReview } = useCanReview(productId);

  const wishlisted = product ? isInWishlist(product.id) : false;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading product...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="error-outline" size={48} color={colors.textTertiary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
          {error || 'Product not found'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: spacing.md, padding: spacing.sm }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ===== BOTTOM SHEET ANIMATION HELPERS =====
  const openBottomSheet = (action: 'buy' | 'bag') => {
    setPendingAction(action);
    setIsModalVisible(true);
    // Reset selection state for fresh open
    setSizeError(false);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 150,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
    });
  };

  // ===== CONFIRM handler inside bottom sheet =====
  const handleConfirm = () => {
    const hasSizes = product.sizes && product.sizes.length > 0;

    if (hasSizes && !selectedSize) {
      setSizeError(true);
      Alert.alert('Select Size', 'Please select a size before proceeding.');
      return;
    }

    const size = selectedSize || 'One Size';
    const color = selectedColor || product.colors[0]?.name || 'Default';

    for (let i = 0; i < quantity; i++) {
      addItem(product, size, color);
    }

    closeBottomSheet();

    if (pendingAction === 'bag') {
      setAddedToBag(true);
    } else {
      // Navigate to checkout immediately
      navigation.navigate('Checkout');
    }
  };

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, 10));
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  const handleWishlistToggle = () => {
    toggleItem(product);
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setSizeError(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Myntra-style Header with Search Bar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBarTouchable}
          onPress={() => navigation.navigate('Search', {})}
          activeOpacity={0.7}
        >
          <View style={styles.searchBarContainer}>
            <Icon name="search" size={20} color={colors.textTertiary} />
            <Text style={styles.searchPlaceholder}>Search in Myntra</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Main', { screen: 'BagTab' } as any)}
          >
            <Icon name="shopping-bag" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ===== 1. IMAGE CAROUSEL ===== */}
        <View style={styles.imageCarousel}>
          <CircularImageCarousel
            images={product.images}
            height={width * 1.2}
            showIndicators={true}
          />

          {/* Discount Badge - Top Left */}
          {product.discount >= 10 && (
            <Badge
              text={`${product.discount}% OFF`}
              variant="discount"
              style={styles.discountBadge}
            />
          )}

          {/* Rating Badge - Bottom Right (Myntra style) — always visible */}
          <View style={styles.imageRatingBadge}>
            <Text style={styles.imageRatingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.imageRatingStar}>★</Text>
            <View style={styles.imageRatingDivider} />
            <Text style={styles.imageRatingCount}>
              {product.ratingCount >= 1000 ? `${(product.ratingCount / 1000).toFixed(1)}k` : product.ratingCount}
            </Text>
          </View>
        </View>

        {/* Product Info Container with Share/Wishlist buttons */}
        <View style={styles.productInfo}>
          {/* Top Row: Brand + Name & Action Buttons */}
          <View style={styles.productHeaderRow}>
            {/* Left: Brand & Name inline */}
            <View style={styles.productHeaderLeft}>
              <Text style={styles.brandNameInline}>
                <Text style={styles.brand}>{product.brand}</Text>
                {'  '}
                <Text style={styles.name}>{product.name}</Text>
              </Text>
            </View>
            {/* Right: Share & Wishlist Buttons (Myntra style) */}
            <View style={styles.productHeaderRight}>
              <TouchableOpacity style={styles.imageActionButton}>
                <Icon name="share" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageActionButton}
                onPress={handleWishlistToggle}
              >
                <Icon
                  name={wishlisted ? 'favorite' : 'favorite-border'}
                  size={22}
                  color={wishlisted ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price & Tax - full width */}
          <View style={styles.priceRow}>
            <Price
              price={product.price}
              originalPrice={product.originalPrice}
              discount={product.discount}
              size="large"
            />
          </View>
          <Text style={styles.taxInfo}>inclusive of all taxes</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* ===== 3. SIZE SELECTOR (visible on main page) ===== */}
          {product.sizes && product.sizes.length > 0 && (
            <>
              <View style={styles.section}>
                <View style={styles.sizeSectionHeader}>
                  <Text style={styles.sectionTitle}>SELECT SIZE</Text>
                  <TouchableOpacity>
                    <Text style={styles.sizeGuideInline}>SIZE CHART</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sizeOptions}>
                  {product.sizes.map(size => (
                    <TouchableOpacity
                      key={size.label}
                      style={[
                        styles.sizeChip,
                        selectedSize === size.label && styles.sizeChipSelected,
                        !size.available && styles.sizeChipDisabled,
                      ]}
                      onPress={() => size.available && handleSizeSelect(size.label)}
                      disabled={!size.available}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sizeChipText,
                          selectedSize === size.label && styles.sizeChipTextSelected,
                          !size.available && styles.sizeChipTextDisabled,
                        ]}
                      >
                        {size.label}
                      </Text>
                      {!size.available && <View style={styles.sizeChipStrike} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}


          {/* ===== 4. SELLER NAME (small, subtle) ===== */}
          {product.sellerName && (
            <View style={styles.sellerSection}>
              <Icon name="storefront" size={14} color={colors.textTertiary} />
              <Text style={styles.sellerText}>Sold by {product.sellerName}</Text>
            </View>
          )}

          {/* ===== 5. HIGHLIGHTS SECTION ===== */}
          {product.highlights && product.highlights.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>HIGHLIGHTS</Text>
                <View style={styles.highlightsList}>
                  {product.highlights.map((highlight, index) => (
                    <View key={index} style={styles.highlightItem}>
                      <View style={styles.bulletPoint} />
                      <Text style={styles.highlightText}>{highlight}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* ===== 6. ATTRIBUTES SECTION (Table-style) ===== */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SPECIFICATIONS</Text>
                <View style={styles.attributesTable}>
                  {Object.entries(product.attributes).map(([key, value], index) => (
                    <View
                      key={key}
                      style={[
                        styles.attributeRow,
                        index % 2 === 0 && styles.attributeRowAlt
                      ]}
                    >
                      <Text style={styles.attributeKey}>{key}</Text>
                      <Text style={styles.attributeValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Divider before Delivery Options */}
          <View style={styles.divider} />

          {/* Delivery Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY OPTIONS</Text>
            <View style={styles.deliveryRow}>
              <Icon name="local-shipping" size={20} color={colors.textSecondary} />
              <Text style={styles.deliveryText}>
                Get it by {product.deliveryDays} days
              </Text>
            </View>
            <View style={styles.deliveryRow}>
              <Icon name="cached" size={20} color={colors.textSecondary} />
              <Text style={styles.deliveryText}>
                Easy 30 days returns & exchange
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* ===== 7. DESCRIPTION ===== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRODUCT DETAILS</Text>
            <Text style={styles.description}>{product.description || 'No description available.'}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* ===== 8. REVIEWS SECTION ===== */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>RATINGS & REVIEWS</Text>
              {canReview && (
                <TouchableOpacity
                  style={styles.writeReviewButton}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Icon name="rate-review" size={16} color={colors.primary} />
                  <Text style={styles.writeReviewText}>Write Review</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Review Stats Summary */}
            {reviewStats && reviewStats.totalReviews > 0 ? (
              <View style={styles.reviewsSummary}>
                <View style={styles.ratingBig}>
                  <Text style={styles.ratingBigNumber}>{reviewStats.averageRating.toFixed(1)}</Text>
                  <Icon name="star" size={24} color={colors.star} />
                </View>
                <Text style={styles.totalReviewsText}>
                  Based on {reviewStats.totalReviews} review{reviewStats.totalReviews > 1 ? 's' : ''}
                </Text>

                {/* Rating Breakdown */}
                <View style={styles.ratingBreakdown}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviewStats.ratingBreakdown[star as 1 | 2 | 3 | 4 | 5];
                    const percentage = (count / reviewStats.totalReviews) * 100;
                    return (
                      <View key={star} style={styles.ratingBarRow}>
                        <Text style={styles.ratingBarLabel}>{star}</Text>
                        <Icon name="star" size={12} color={colors.star} />
                        <View style={styles.ratingBarTrack}>
                          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.noReviewsContainer}>
                <Icon name="rate-review" size={48} color={colors.textTertiary} />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                {canReview && (
                  <Text style={styles.noReviewsSubtext}>Be the first to review this product</Text>
                )}
              </View>
            )}

            {/* Individual Reviews */}
            {reviews.slice(0, 3).map((review: ReviewWithUser) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUserInfo}>
                    <View style={styles.reviewAvatar}>
                      <Icon name="person" size={16} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.reviewUserName}>{review.user_name}</Text>
                    {review.is_verified_purchase && (
                      <Badge text="Verified" variant="success" />
                    )}
                  </View>
                  <View style={styles.reviewRating}>
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    <Icon name="star" size={12} color={colors.star} />
                  </View>
                </View>
                {review.title && (
                  <Text style={styles.reviewTitle}>{review.title}</Text>
                )}
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ))}

            {reviews.length > 3 && (
              <TouchableOpacity style={styles.viewAllReviewsButton}>
                <Text style={styles.viewAllReviewsText}>View All {reviews.length} Reviews</Text>
                <Icon name="chevron-right" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom spacing for scroll — enough room for sticky footer */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ===== STICKY BOTTOM FOOTER: Buy Now + Add to Bag ===== */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {product.inStock ? (
          <>
            {/* Buy Now Button (Left – outlined white) */}
            <TouchableOpacity
              style={styles.buyNowFooterButton}
              onPress={() => openBottomSheet('buy')}
              activeOpacity={0.7}
            >
              <Icon name="flash-on" size={20} color={colors.textPrimary} />
              <Text style={styles.buyNowFooterText}>BUY NOW</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.bottomBarDivider} />

            {/* Add to Bag / Go to Bag Button (Right – primary red) */}
            {addedToBag || bagItems.some(i => i.product.id === product.id) ? (
              <TouchableOpacity
                style={styles.addToBagFooterButton}
                onPress={() => navigation.navigate('Main', { screen: 'BagTab' } as any)}
                activeOpacity={0.8}
              >
                <Icon name="shopping-bag" size={20} color={colors.white} />
                <Text style={styles.addToBagFooterText}>GO TO BAG</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addToBagFooterButton}
                onPress={() => openBottomSheet('bag')}
                activeOpacity={0.8}
              >
                <Icon name="shopping-bag" size={20} color={colors.white} />
                <Text style={styles.addToBagFooterText}>ADD TO BAG</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={[styles.addToBagFooterButton, styles.outOfStockButton, { flex: 1 }]}>
            <Icon name="block" size={20} color={colors.white} />
            <Text style={styles.addToBagFooterText}>OUT OF STOCK</Text>
          </View>
        )}
      </View>

      {/* ===== SELECTION BOTTOM SHEET ===== */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeBottomSheet}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeBottomSheet}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        {/* Sliding Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              }],
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />

          {/* Product Mini Summary */}
          <View style={styles.sheetProductSummary}>
            <Image
              source={{ uri: product.images?.[0] }}
              style={styles.sheetProductImage}
            />
            <View style={styles.sheetProductInfo}>
              <Text style={styles.sheetProductName} numberOfLines={1}>
                {product.brand} – {product.name}
              </Text>
              <View style={styles.sheetPriceRow}>
                <Text style={styles.sheetPrice}>₹{product.price}</Text>
                {product.originalPrice > product.price && (
                  <>
                    <Text style={styles.sheetOriginalPrice}>₹{product.originalPrice}</Text>
                    <Text style={styles.sheetDiscount}>{product.discount}% OFF</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={closeBottomSheet} style={styles.sheetCloseButton}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetDivider} />

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <View style={styles.sheetSection}>
              <View style={styles.sheetSectionHeader}>
                <Text style={[
                  styles.sheetSectionTitle,
                  sizeError && { color: colors.error },
                ]}>
                  SELECT SIZE
                </Text>
                <TouchableOpacity>
                  <Text style={styles.sizeGuide}>SIZE CHART</Text>
                </TouchableOpacity>
              </View>

              {sizeError && (
                <View style={styles.sheetSizeErrorBanner}>
                  <Icon name="error-outline" size={14} color={colors.error} />
                  <Text style={styles.sheetSizeErrorText}>Please select a size</Text>
                </View>
              )}

              <View style={styles.sizeOptions}>
                {product.sizes.map(size => (
                  <TouchableOpacity
                    key={size.label}
                    style={[
                      styles.sizeChip,
                      selectedSize === size.label && styles.sizeChipSelected,
                      !size.available && styles.sizeChipDisabled,
                      sizeError && !selectedSize && size.available && styles.sizeChipError,
                    ]}
                    onPress={() => size.available && handleSizeSelect(size.label)}
                    disabled={!size.available}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        selectedSize === size.label && styles.sizeChipTextSelected,
                        !size.available && styles.sizeChipTextDisabled,
                      ]}
                    >
                      {size.label}
                    </Text>
                    {!size.available && <View style={styles.sizeChipStrike} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Color Selection (in sheet) */}
          {product.colors && product.colors.length > 1 && (
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionTitle}>SELECT COLOR</Text>
              <View style={styles.colorOptions}>
                {product.colors.map(color => (
                  <TouchableOpacity
                    key={color.name}
                    style={[
                      styles.colorButton,
                      selectedColor === color.name && styles.colorButtonSelected,
                    ]}
                    onPress={() => color.available && setSelectedColor(color.name)}
                    disabled={!color.available}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: color.hex },
                        !color.available && styles.colorSwatchDisabled,
                      ]}
                    />
                    <Text style={styles.colorName}>{color.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.sheetDivider} />

          {/* Quantity Stepper */}
          <View style={styles.sheetSection}>
            <Text style={styles.sheetSectionTitle}>QUANTITY</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity <= 1 && styles.quantityButtonDisabled,
                ]}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
                activeOpacity={0.7}
              >
                <Icon name="remove" size={20} color={quantity <= 1 ? colors.textDisabled : colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity >= 10 && styles.quantityButtonDisabled,
                ]}
                onPress={incrementQuantity}
                disabled={quantity >= 10}
                activeOpacity={0.7}
              >
                <Icon name="add" size={20} color={quantity >= 10 ? colors.textDisabled : colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.sheetConfirmButton,
              pendingAction === 'buy' ? styles.sheetConfirmBuyNow : styles.sheetConfirmAddToBag,
            ]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Icon
              name={pendingAction === 'buy' ? 'flash-on' : 'shopping-bag'}
              size={20}
              color={colors.white}
            />
            <Text style={styles.sheetConfirmText}>
              {pendingAction === 'buy' ? 'BUY NOW' : 'ADD TO BAG'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        productId={productId}
        productName={product.name}
        onClose={() => setShowReviewModal(false)}
        onSubmit={refetchReviews}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  headerButton: {
    padding: spacing.sm,
  },

  headerActions: {
    flexDirection: 'row',
  },

  // Myntra-style search bar in header
  searchBarTouchable: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  searchPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
    flex: 1,
  },

  content: {
    flex: 1,
  },

  imageCarousel: {
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
  },

  productImage: {
    width: width,
    height: width * 1.2,
    resizeMode: 'cover',
  },

  imageIndicators: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },

  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    opacity: 0.5,
  },

  indicatorActive: {
    opacity: 1,
    backgroundColor: colors.primary,
  },

  discountBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },

  // Myntra-style rating badge overlay on image (bottom-right)
  imageRatingBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  imageRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  imageRatingStar: {
    fontSize: 11,
    color: colors.success,
    marginLeft: 2,
  },

  imageRatingDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },

  imageRatingCount: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Myntra-style share & wishlist action row below image
  imageActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  imageActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  imageActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  imageActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  productInfo: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },

  // Myntra-style product header row with brand/name on left and actions on right
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  productHeaderLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },

  productHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  brandNameInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  brand: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  name: {
    ...typography.body,
    color: colors.textSecondary,
  },

  ratingRow: {
    marginTop: spacing.md,
  },

  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },

  priceRow: {
    marginTop: spacing.sm,
  },

  taxInfo: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.xs,
  },

  section: {
    marginBottom: spacing.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },

  sizeGuide: {
    ...typography.label,
    color: colors.primary,
  },

  sizeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sizeGuideInline: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
  },

  // ===== SIZE ERROR BANNER =====
  sizeErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },

  sizeErrorText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },

  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  // ===== CIRCULAR SIZE CHIPS (Myntra-style) =====
  sizeChip: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    position: 'relative',
    overflow: 'hidden',
  },

  sizeChipSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFF0F3',
  },

  sizeChipDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },

  sizeChipError: {
    borderColor: colors.error,
  },

  sizeChipText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  sizeChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },

  sizeChipTextDisabled: {
    color: colors.textDisabled,
  },

  // Diagonal strike-through line for unavailable sizes
  sizeChipStrike: {
    position: 'absolute',
    width: 60,
    height: 1,
    backgroundColor: colors.textDisabled,
    transform: [{ rotate: '-45deg' }],
  },

  // ===== QUANTITY SELECTOR =====
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },

  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  quantityButtonDisabled: {
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },

  quantityDisplay: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
  },

  quantityText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  colorButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.transparent,
  },

  colorButtonSelected: {
    borderColor: colors.primary,
  },

  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  colorSwatchDisabled: {
    opacity: 0.3,
  },

  colorName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  deliveryText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },

  // ===== STICKY BOTTOM BAR =====
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },

  buyNowFooterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
    gap: spacing.sm,
  },

  buyNowFooterText: {
    ...typography.button,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  bottomBarDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },

  addToBagFooterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },

  addToBagFooterText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  outOfStockButton: {
    backgroundColor: colors.textDisabled,
  },

  // ===== BOTTOM SHEET MODAL =====
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },

  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  sheetProductSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  sheetProductImage: {
    width: 52,
    height: 64,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    resizeMode: 'cover',
  },

  sheetProductInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  sheetProductName: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },

  sheetPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  sheetPrice: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  sheetOriginalPrice: {
    ...typography.body,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
    fontSize: 13,
  },

  sheetDiscount: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },

  sheetCloseButton: {
    padding: spacing.sm,
  },

  sheetDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },

  sheetSection: {
    marginBottom: spacing.lg,
  },

  sheetSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sheetSectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 13,
  },

  sheetSizeErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },

  sheetSizeErrorText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },

  sheetConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  sheetConfirmAddToBag: {
    backgroundColor: colors.primary,
  },

  sheetConfirmBuyNow: {
    backgroundColor: '#282C3F',
  },

  sheetConfirmText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== SELLER SECTION STYLES =====
  sellerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },

  sellerText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // ===== HIGHLIGHTS SECTION STYLES =====
  highlightsList: {
    marginTop: spacing.sm,
  },

  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },

  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7, // Center vertically with text
    marginRight: spacing.sm,
  },

  highlightText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  // ===== ATTRIBUTES TABLE STYLES =====
  attributesTable: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  attributeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  attributeRowAlt: {
    backgroundColor: colors.backgroundSecondary,
  },

  attributeKey: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '500',
  },

  attributeValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  // ===== REVIEWS SECTION STYLES =====
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },

  writeReviewText: {
    ...typography.label,
    color: colors.primary,
  },

  reviewsSummary: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.lg,
  },

  ratingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  ratingBigNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  totalReviewsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  ratingBreakdown: {
    width: '100%',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },

  ratingBarLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 12,
    textAlign: 'center',
  },

  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },

  ratingBarFill: {
    height: '100%',
    backgroundColor: colors.star,
    borderRadius: 3,
  },

  ratingBarCount: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },

  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },

  noReviewsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  noReviewsSubtext: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  reviewCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewUserName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },

  reviewRatingText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },

  reviewTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  reviewComment: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },

  reviewDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },

  viewAllReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },

  viewAllReviewsText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
