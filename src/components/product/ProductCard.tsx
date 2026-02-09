import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Product } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Badge } from '../common/Badge';
import { Price } from '../common/Price';
import { useWishlistStore } from '../../store';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;
const IMAGE_HEIGHT = CARD_WIDTH * 1.3;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({ product, onPress }) => {
  const { isInWishlist, toggleItem } = useWishlistStore();
  const wishlisted = isInWishlist(product.id);

  const handleWishlistPress = () => {
    toggleItem(product);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={handleWishlistPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={wishlisted ? 'favorite' : 'favorite-border'}
            size={22}
            color={wishlisted ? colors.primary : colors.textPrimary}
          />
        </TouchableOpacity>

        {/* Discount Badge */}
        {product.discount >= 20 && (
          <Badge
            text={`${product.discount}% OFF`}
            variant="discount"
            style={styles.discountBadge}
          />
        )}

        {/* Rating Badge - Bottom Right (Myntra style) */}
        {product.ratingCount > 0 && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.ratingBadgeStar}>★</Text>
            <View style={styles.ratingDivider} />
            <Text style={styles.ratingBadgeCount}>
              {product.ratingCount >= 1000 ? `${(product.ratingCount / 1000).toFixed(1)}k` : product.ratingCount}
            </Text>
          </View>
        )}

        {/* Out of Stock Overlay */}
        {!product.inStock && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Brand */}
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
        </Text>

        {/* Product Name */}
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        {/* Seller Name - subtle display */}
        {product.sellerName && (
          <Text style={styles.sellerName} numberOfLines={1}>
            Sold by {product.sellerName}
          </Text>
        )}

        {/* Price */}
        <Price
          price={product.price}
          originalPrice={product.originalPrice}
          discount={product.discount}
          size="small"
          showDiscount={false}
        />
      </View>
    </TouchableOpacity>
  );
});

ProductCard.displayName = 'ProductCard';

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },

  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  wishlistButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 10,
  },

  discountBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },

  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },

  soldOutText: {
    ...typography.label,
    color: colors.white,
    backgroundColor: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  infoContainer: {
    padding: spacing.sm,
    paddingTop: spacing.md,
  },

  brand: {
    ...typography.brand,
    color: colors.textPrimary,
  },

  name: {
    ...typography.productName,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },

  sellerName: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
    fontStyle: 'italic',
  },

  // Myntra-style rating badge at bottom-right of image
  ratingBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  ratingBadgeStar: {
    fontSize: 10,
    color: colors.success,
    marginLeft: 2,
  },

  ratingDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },

  ratingBadgeCount: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
