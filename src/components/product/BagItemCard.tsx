import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CartItem } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Price } from '../common/Price';
import { useBagStore } from '../../store';

interface BagItemCardProps {
  item: CartItem;
  onPress?: () => void;
}

export const BagItemCard: React.FC<BagItemCardProps> = memo(({ item, onPress }) => {
  const { updateQuantity, removeItem } = useBagStore();
  const { product, quantity, selectedSize, selectedColor } = item;

  const handleIncrease = () => {
    updateQuantity(product.id, selectedSize, selectedColor, quantity + 1);
  };

  const handleDecrease = () => {
    updateQuantity(product.id, selectedSize, selectedColor, quantity - 1);
  };

  const handleRemove = () => {
    removeItem(product.id, selectedSize, selectedColor);
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

        {/* Quantity Controls */}
        <View style={styles.quantityRow}>
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

          <TouchableOpacity onPress={handleRemove}>
            <Icon name="delete-outline" size={22} color={colors.textSecondary} />
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

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },

  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
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

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  deliveryText: {
    ...typography.caption,
    color: colors.success,
  },
});
