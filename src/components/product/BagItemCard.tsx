import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CartItem } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Price } from '../common/Price';
import { useBagStore, useWishlistStore } from '../../store';

interface BagItemCardProps {
  item: CartItem;
  onPress?: () => void;
}

export const BagItemCard: React.FC<BagItemCardProps> = memo(({ item, onPress }) => {
  const { updateQuantity, removeItem } = useBagStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { product, quantity, selectedSize, selectedColor } = item;
  const wishlisted = isInWishlist(product.id);

  const handleIncrease = () => {
    updateQuantity(product.id, selectedSize, selectedColor, quantity + 1);
  };

  const handleDecrease = () => {
    updateQuantity(product.id, selectedSize, selectedColor, quantity - 1);
  };

  const handleRemove = () => {
    removeItem(product.id, selectedSize, selectedColor);
  };

  const handleMoveToWishlist = () => {
    if (!wishlisted) {
      toggleItem(product);
    }
    removeItem(product.id, selectedSize, selectedColor);
    Alert.alert('Moved to Wishlist', `${product.name} has been moved to your wishlist.`);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Product Image */}
      <Image source={{ uri: product.images[0] }} style={styles.image} />

      {/* Product Details */}
      <View style={styles.details}>
        {/* Top section: Info + Wishlist icon */}
        <View style={styles.topRow}>
          <View style={styles.infoSection}>
            <Text style={styles.brand}>{product.brand}</Text>
            <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

            {/* Size & Color */}
            <View style={styles.variantRow}>
              <Text style={styles.variant}>Size: {selectedSize}</Text>
              <Text style={styles.variant}>Color: {selectedColor}</Text>
            </View>

            {/* Price */}
            <Price
              price={product.price * quantity}
              originalPrice={product.originalPrice * quantity}
              discount={product.discount}
              size="small"
            />
          </View>

          {/* Wishlist icon - top right */}
          <TouchableOpacity onPress={handleMoveToWishlist} style={styles.wishlistButton}>
            <Icon
              name={wishlisted ? 'favorite' : 'favorite-border'}
              size={20}
              color={wishlisted ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom section: Quantity + Delivery on left, Delete on right */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            {/* Quantity Controls */}
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleDecrease}
              >
                <Icon name="remove" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.quantity}>{quantity}</Text>

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleIncrease}
              >
                <Icon name="add" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Delivery Info */}
            <View style={styles.deliveryRow}>
              <Icon name="local-shipping" size={14} color={colors.success} />
              <Text style={styles.deliveryText}>
                Delivery in {product.deliveryDays} days
              </Text>
            </View>
          </View>

          {/* Delete icon - bottom right */}
          <TouchableOpacity onPress={handleRemove} style={styles.deleteButton}>
            <Icon name="delete-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

BagItemCard.displayName = 'BagItemCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    justifyContent: 'space-between',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  infoSection: {
    flex: 1,
    paddingRight: spacing.sm,
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

  variantRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },

  variant: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  wishlistButton: {
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },

  bottomLeft: {
    flex: 1,
    gap: spacing.xs,
  },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },

  quantityButton: {
    padding: spacing.xs,
  },

  quantity: {
    ...typography.body,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    minWidth: 40,
    textAlign: 'center',
  },

  deleteButton: {
    padding: spacing.xs,
  },

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  deliveryText: {
    ...typography.caption,
    color: colors.success,
  },
});
