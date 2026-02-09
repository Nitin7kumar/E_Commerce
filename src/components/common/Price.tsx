import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface PriceProps {
  price: number;
  originalPrice?: number;
  discount?: number;
  size?: 'small' | 'medium' | 'large';
  showDiscount?: boolean;
  style?: ViewStyle;
}

const formatPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

export const Price: React.FC<PriceProps> = ({
  price,
  originalPrice,
  discount,
  size = 'medium',
  showDiscount = true,
  style,
}) => {
  const hasDiscount = originalPrice && originalPrice > price;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.price, styles[`${size}Price`]]}>
        {formatPrice(price)}
      </Text>

      {hasDiscount && (
        <>
          <Text style={[styles.originalPrice, styles[`${size}Original`]]}>
            {formatPrice(originalPrice)}
          </Text>

          {showDiscount && discount !== undefined && discount > 0 && (
            <Text style={[styles.discount, styles[`${size}Discount`]]}>
              ({discount}% OFF)
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  price: {
    color: colors.priceFinal,
    fontWeight: '700',
  },

  originalPrice: {
    color: colors.priceOriginal,
    textDecorationLine: 'line-through',
  },

  discount: {
    color: colors.priceDiscounted,
    fontWeight: '500',
  },

  // Size variants
  smallPrice: {
    fontSize: 12,
  },
  smallOriginal: {
    fontSize: 10,
  },
  smallDiscount: {
    fontSize: 10,
  },

  mediumPrice: {
    fontSize: 14,
  },
  mediumOriginal: {
    fontSize: 12,
  },
  mediumDiscount: {
    fontSize: 12,
  },

  largePrice: {
    fontSize: 18,
  },
  largeOriginal: {
    fontSize: 14,
  },
  largeDiscount: {
    fontSize: 14,
  },
});
