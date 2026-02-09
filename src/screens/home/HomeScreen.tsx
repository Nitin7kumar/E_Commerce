import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SearchBar, ProductCard } from '../../components';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList, HomeStackParamList, Product } from '../../types';
import { useUserStore, useBagStore } from '../../store';
import { useProducts } from '../../services/productService';
import { useRootCategories } from '../../services/categoryService';
import {
  homeBanners,
  categories as mockCategories,
} from '../../mocks/fixtures';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Layout Constants
const HORIZONTAL_PADDING = 16;
const CATEGORY_SIZE = 72;
const CATEGORY_GAP = 16;
const PRODUCT_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 12) / 2;
const BANNER_HEIGHT = 180;

type NavigationProp = NativeStackNavigationProp<RootStackParamList & HomeStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const bannerScrollRef = useRef<FlatList>(null);

  const { addresses, getDefaultAddress } = useUserStore();
  const bagCount = useBagStore(state => state.getTotalItems());
  const defaultAddress = getDefaultAddress();

  // Fetch products from Supabase
  const { products, loading: productsLoading, error: productsError, refetch } = useProducts();

  // Fetch categories from Supabase with fallback to mock data
  const { categories: dbCategories, loading: categoriesLoading } = useRootCategories();

  // Use database categories if available, otherwise fallback to mock
  const displayCategories = dbCategories.length > 0 ? dbCategories : mockCategories;

  // =====================================================
  // NAVIGATION HANDLERS
  // =====================================================

  const handleProfilePress = () => {
    navigation.navigate('ProfileStack');
  };

  const handleSearchPress = () => {
    navigation.navigate('Search', {});
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const handleCategoryPress = (categoryId: string, name: string) => {
    navigation.navigate('ProductList', { categoryId, title: name });
  };

  const handleBagPress = () => {
    navigation.getParent()?.navigate('BagTab');
  };

  const getShortAddress = () => {
    if (!defaultAddress) return 'Add Address';
    const words = defaultAddress.locality.split(' ').slice(0, 2).join(' ');
    return words || defaultAddress.city;
  };

  const handleAddAddress = () => {
    setShowAddressDropdown(false);
    navigation.navigate('AddAddress', {});
  };

  // =====================================================
  // RENDER: HERO BANNER
  // =====================================================

  const renderBanner = ({ item }: { item: typeof homeBanners[0] }) => (
    <TouchableOpacity
      style={styles.bannerCard}
      onPress={() => item.categoryId && handleCategoryPress(item.categoryId, item.title)}
      activeOpacity={0.95}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      <View style={styles.bannerGradient}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTag}>FEATURED</Text>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
          )}
          <View style={styles.bannerCta}>
            <Text style={styles.bannerCtaText}>Shop Now</Text>
            <Icon name="arrow-forward" size={16} color={colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // =====================================================
  // RENDER: CATEGORY ITEM (CIRCULAR)
  // =====================================================

  const renderCategoryItem = ({ item }: { item: any }) => {
    // Handle both DBCategory and mock Category formats
    const imageUrl = 'image_url' in item
      ? (item.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200')
      : (item.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200');

    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleCategoryPress(item.id, item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryImageWrapper}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.categoryLabel} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // RENDER: PRODUCT GRID
  // =====================================================

  const renderProductGrid = () => {
    if (productsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      );
    }

    if (productsError) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="cloud-off" size={56} color={colors.textTertiary} />
          <Text style={styles.errorTitle}>Unable to load products</Text>
          <Text style={styles.errorSubtitle}>Please check your connection</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="shopping-bag" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySubtitle}>Check back soon for new arrivals</Text>
        </View>
      );
    }

    return (
      <View style={styles.productGrid}>
        {products.slice(0, 10).map((product, index) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCardContainer}
            onPress={() => handleProductPress(product.id)}
            activeOpacity={0.9}
          >
            {/* Product Image */}
            <View style={styles.productImageContainer}>
              <Image
                source={{ uri: product.images[0] || 'https://via.placeholder.com/200' }}
                style={styles.productImage}
                resizeMode="cover"
              />
              {product.discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}% OFF</Text>
                </View>
              )}
              {/* Wishlist Icon */}
              <TouchableOpacity style={styles.wishlistIcon}>
                <Icon name="favorite-border" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={styles.productBrand}>{product.brand}</Text>
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
                {product.originalPrice > product.price && (
                  <Text style={styles.originalPrice}>
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
              {/* Rating */}
              {product.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                  <Icon name="star" size={12} color={colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ===== STICKY HEADER ===== */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Top Row: Logo + Address (full width) */}
        <View style={styles.headerTopRow}>
          <Text style={styles.logoText}>MYNTRA</Text>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowAddressDropdown(true)}
          >
            <Icon name="location-on" size={18} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {getShortAddress()}
            </Text>
            <Icon name="keyboard-arrow-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Bottom Row: Search Bar + Bag + Profile */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.searchContainer} onPress={handleSearchPress}>
            <Icon name="search" size={22} color={colors.textTertiary} />
            <Text style={styles.searchPlaceholder}>Search for products, brands...</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconButton} onPress={handleBagPress}>
            <Icon name="shopping-bag" size={24} color={colors.textPrimary} />
            {bagCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{bagCount > 9 ? '9+' : bagCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerIconButton} onPress={handleProfilePress}>
            <Icon name="person-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ===== HERO BANNER ===== */}
        <View style={styles.bannerSection}>
          <FlatList
            ref={bannerScrollRef}
            data={homeBanners}
            keyExtractor={(item) => item.id}
            renderItem={renderBanner}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH - HORIZONTAL_PADDING}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerList}
          />
        </View>

        {/* ===== CATEGORIES SECTION ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>See All</Text>
            </TouchableOpacity>
          </View>

          {categoriesLoading ? (
            <View style={styles.categoriesLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {displayCategories.map((item: any) => (
                <View key={item.id}>
                  {renderCategoryItem({ item })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ===== FEATURED PRODUCTS SECTION ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {renderProductGrid()}
        </View>

        {/* ===== TRENDING NOW (Horizontal Scroll) ===== */}
        {products.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={products.slice(0, 8)}
              keyExtractor={(item) => `trending-${item.id}`}
              renderItem={({ item: product }) => (
                <TouchableOpacity
                  style={styles.trendingCard}
                  onPress={() => handleProductPress(product.id)}
                  activeOpacity={0.9}
                >
                  {/* Product Image */}
                  <View style={styles.trendingImageContainer}>
                    <Image
                      source={{ uri: product.images[0] || 'https://via.placeholder.com/200' }}
                      style={styles.trendingImage}
                      resizeMode="cover"
                    />
                    {product.discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{product.discount}% OFF</Text>
                      </View>
                    )}
                    {/* Wishlist Icon */}
                    <TouchableOpacity style={styles.wishlistIcon}>
                      <Icon name="favorite-border" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Product Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productBrand}>{product.brand}</Text>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
                      {product.originalPrice > product.price && (
                        <Text style={styles.originalPrice}>
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                    {product.rating > 0 && (
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                        <Icon name="star" size={10} color={colors.white} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductList}
            />
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ===== ADDRESS DROPDOWN MODAL ===== */}
      <Modal
        visible={showAddressDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddressDropdown(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddressDropdown(false)}
        >
          <View style={[styles.dropdownContainer, { marginTop: insets.top + 50 }]}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Delivery Location</Text>
              <TouchableOpacity onPress={() => setShowAddressDropdown(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {defaultAddress ? (
              <View style={styles.addressCard}>
                <View style={styles.addressIconBox}>
                  <Icon name="home" size={20} color={colors.primary} />
                </View>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressType}>{defaultAddress.type.toUpperCase()}</Text>
                  <Text style={styles.addressLine} numberOfLines={2}>
                    {defaultAddress.address}, {defaultAddress.locality}
                  </Text>
                  <Text style={styles.addressCity}>
                    {defaultAddress.city} - {defaultAddress.pincode}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noAddressContainer}>
                <Icon name="add-location-alt" size={40} color={colors.textTertiary} />
                <Text style={styles.noAddressText}>No address added yet</Text>
              </View>
            )}

            <TouchableOpacity style={styles.addAddressButton} onPress={handleAddAddress}>
              <Icon name="add" size={20} color={colors.primary} />
              <Text style={styles.addAddressText}>
                {defaultAddress ? 'Change Address' : 'Add New Address'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },

  // ===== HEADER =====
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: spacing.sm,
  },

  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },

  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    maxWidth: 140,
    flex: 1,
    marginHorizontal: spacing.sm,
  },

  locationText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
    marginHorizontal: 4,
    flex: 1,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },

  cartBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },

  searchPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
    flex: 1,
    fontSize: 14,
  },

  // ===== SCROLL VIEW =====
  scrollView: {
    flex: 1,
  },

  // ===== BANNER SECTION =====
  bannerSection: {
    marginTop: spacing.md,
  },

  bannerList: {
    paddingHorizontal: HORIZONTAL_PADDING / 2,
  },

  bannerCard: {
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2,
    height: BANNER_HEIGHT,
    marginHorizontal: HORIZONTAL_PADDING / 2,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },

  bannerImage: {
    width: '100%',
    height: '100%',
  },

  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },

  bannerContent: {
    padding: spacing.lg,
  },

  bannerTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    opacity: 0.9,
  },

  bannerTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },

  bannerSubtitle: {
    ...typography.body,
    color: colors.white,
    marginTop: spacing.xxs,
    opacity: 0.9,
  },

  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },

  bannerCtaText: {
    ...typography.label,
    color: colors.white,
    fontWeight: '600',
  },

  // ===== SECTIONS =====
  section: {
    marginTop: spacing.xl,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  seeAllLink: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },

  // ===== CATEGORIES =====
  categoriesLoading: {
    height: CATEGORY_SIZE + 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoriesContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: CATEGORY_GAP,
  },

  categoryItem: {
    alignItems: 'center',
    width: CATEGORY_SIZE,
    marginRight: CATEGORY_GAP,
  },

  categoryImageWrapper: {
    width: CATEGORY_SIZE,
    height: CATEGORY_SIZE,
    borderRadius: CATEGORY_SIZE / 2, // Circular
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  categoryImage: {
    width: CATEGORY_SIZE,
    height: CATEGORY_SIZE,
  },

  categoryLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: spacing.xs,
    textAlign: 'center',
    width: CATEGORY_SIZE,
  },

  // ===== PRODUCT GRID =====
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 12,
  },

  productCardContainer: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },

  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },

  wishlistIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  productInfo: {
    padding: spacing.sm,
  },

  productBrand: {
    ...typography.caption,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  productName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },

  productPrice: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },

  originalPrice: {
    ...typography.caption,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    gap: 2,
  },

  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },

  // ===== HORIZONTAL PRODUCT LIST =====
  horizontalProductList: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },

  horizontalProductCard: {
    marginRight: spacing.md,
  },

  trendingCard: {
    width: 160,
    marginRight: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  trendingImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },

  trendingImage: {
    width: '100%',
    height: '100%',
  },

  // ===== LOADING / ERROR / EMPTY STATES =====
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: HORIZONTAL_PADDING,
  },

  errorTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },

  errorSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },

  retryText: {
    ...typography.label,
    color: colors.white,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },

  emptyTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },

  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ===== BOTTOM SPACER =====
  bottomSpacer: {
    height: spacing.huge,
  },

  // ===== ADDRESS MODAL =====
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },

  dropdownContainer: {
    backgroundColor: colors.white,
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },

  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  dropdownTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  addressCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },

  addressIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addressDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },

  addressType: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  addressLine: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: 2,
  },

  addressCity: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  noAddressText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },

  addAddressText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
});
