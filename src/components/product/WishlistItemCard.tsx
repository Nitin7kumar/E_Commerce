import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Product } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Price } from '../common/Price';
import { useWishlistStore } from '../../store';

interface WishlistItemCardProps {
  product: Product;
  onPress: () => void;
  onAddToBag: () => void;
}

export const WishlistItemCard: React.FC<WishlistItemCardProps> = memo(({
  product,
  onPress,
  onAddToBag,
}) => {
  const { removeItem } = useWishlistStore();

  const handleRemove = () => {
    removeItem(product.id);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Remove Button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Product Image */}
      <Image source={{ uri: product.images[0] }} style={styles.image} />

      {/* Product Details */}
      <View style={styles.details}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <Price
          price={product.price}
          originalPrice={product.originalPrice}
          discount={product.discount}
          size="small"
        />

        {!product.inStock ? (
          <Text style={styles.outOfStock}>Currently Out of Stock</Text>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={onAddToBag}>
            <Icon name="shopping-bag" size={16} color={colors.primary} />
            <Text style={styles.addButtonText}>MOVE TO BAG</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

WishlistItemCard.displayName = 'WishlistItemCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    position: 'relative',
  },

  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    padding: spacing.xs,
  },

  image: {
    width: 100,
    height: 130,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
  },

  details: {
    flex: 1,
    marginLeft: spacing.md,
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

  outOfStock: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },

  addButtonText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
});
