import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface RatingProps {
  rating: number;
  count?: number;
  size?: 'small' | 'medium';
  showCount?: boolean;
}

export const Rating: React.FC<RatingProps> = ({
  rating,
  count,
  size = 'small',
  showCount = true,
}) => {
  const getRatingColor = (value: number) => {
    if (value >= 4) return colors.success;
    if (value >= 3) return colors.secondary;
    return colors.error;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.ratingBox, { backgroundColor: getRatingColor(rating) }]}>
        <Text style={[styles.rating, size === 'small' ? styles.smallRating : styles.mediumRating]}>
          {rating.toFixed(1)}
        </Text>
        <Text style={[styles.star, size === 'small' ? styles.smallStar : styles.mediumStar]}>
          ★
        </Text>
      </View>
      
      {showCount && count !== undefined && (
        <Text style={[styles.count, size === 'small' ? styles.smallCount : styles.mediumCount]}>
          ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
    gap: 2,
  },

  rating: {
    color: colors.white,
    fontWeight: '600',
  },

  star: {
    color: colors.white,
  },

  count: {
    color: colors.textTertiary,
  },

  // Sizes
  smallRating: {
    fontSize: 10,
  },
  smallStar: {
    fontSize: 8,
  },
  smallCount: {
    fontSize: 10,
  },

  mediumRating: {
    fontSize: 12,
  },
  mediumStar: {
    fontSize: 10,
  },
  mediumCount: {
    fontSize: 12,
  },
});
