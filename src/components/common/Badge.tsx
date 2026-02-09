import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type BadgeVariant = 'discount' | 'new' | 'trending' | 'soldout' | 'info' | 'success';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'info',
  size = 'small',
  style,
}) => {
  return (
    <View style={[styles.base, styles[variant], styles[size], style]}>
      <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.xs,
  },

  // Variants
  discount: {
    backgroundColor: colors.primary,
  },
  new: {
    backgroundColor: colors.info,
  },
  trending: {
    backgroundColor: colors.secondary,
  },
  soldout: {
    backgroundColor: colors.textSecondary,
  },
  info: {
    backgroundColor: colors.backgroundSecondary,
  },
  success: {
    backgroundColor: colors.success,
  },

  // Sizes
  small: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  medium: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Text
  text: {
    ...typography.labelSmall,
    textTransform: 'uppercase',
  },
  discountText: {
    color: colors.white,
  },
  newText: {
    color: colors.white,
  },
  trendingText: {
    color: colors.white,
  },
  soldoutText: {
    color: colors.white,
  },
  infoText: {
    color: colors.textSecondary,
  },
  successText: {
    color: colors.white,
  },

  smallText: {
    fontSize: 9,
  },
  mediumText: {
    fontSize: 11,
  },
});
