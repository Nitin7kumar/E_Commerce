import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductCard } from '../../components';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList, Product, SortOption } from '../../types';
import { useProducts } from '../../services/productService';
import { useFilterStore } from '../../store';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Popularity', value: 'popularity' },
  { label: 'Price: Low to High', value: 'price_low_high' },
  { label: 'Price: High to Low', value: 'price_high_low' },
  { label: 'Newest First', value: 'newest' },
  { label: 'Customer Rating', value: 'rating' },
  { label: 'Better Discount', value: 'discount' },
];

export const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = route.params as {
    categoryId?: string;
    subcategoryId?: string;
    title: string;
  };

  const { sortBy, setSortBy, hasActiveFilters } = useFilterStore();
  const [showSortModal, setShowSortModal] = useState(false);

  // Fetch products from Supabase
  const { products, loading, error, refetch } = useProducts();

  const productList = useMemo(() => {
    let list: Product[] = products;

    // Filter by category if provided
    if (params.categoryId) {
      list = list.filter(p => p.categoryId === params.categoryId);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_low_high':
        return [...list].sort((a, b) => a.price - b.price);
      case 'price_high_low':
        return [...list].sort((a, b) => b.price - a.price);
      case 'newest':
        return list; // Already sorted by created_at from Supabase
      case 'rating':
        return [...list].sort((a, b) => b.rating - a.rating);
      case 'discount':
        return [...list].sort((a, b) => b.discount - a.discount);
      default:
        return [...list].sort((a, b) => b.ratingCount - a.ratingCount);
    }
  }, [products, params.categoryId, sortBy]);

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const currentSort = sortOptions.find(s => s.value === sortBy)?.label || 'Popularity';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.title}
          </Text>
          <Text style={styles.headerSubtitle}>
            {productList.length} items
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.getParent()?.navigate('Search', { query: '' })}
        >
          <Icon name="search" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sort & Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSortModal(!showSortModal)}
        >
          <Icon name="sort" size={18} color={colors.textPrimary} />
          <Text style={styles.filterButtonText}>Sort</Text>
          <Icon name="keyboard-arrow-down" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.filterDivider} />

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {/* Open filter modal */ }}
        >
          <Icon name="filter-list" size={18} color={colors.textPrimary} />
          <Text style={styles.filterButtonText}>Filter</Text>
          {hasActiveFilters() && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {/* Sort Options Dropdown */}
      {showSortModal && (
        <View style={styles.sortDropdown}>
          {sortOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortBy === option.value && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortBy(option.value);
                setShowSortModal(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.value && (
                <Icon name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Product Grid */}
      <FlashList
        data={productList}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <ProductCard
              product={item}
              onPress={() => handleProductPress(item.id)}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="inventory-2" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  backButton: {
    padding: spacing.xs,
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  headerSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  headerIcon: {
    padding: spacing.xs,
  },

  filterBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },

  filterButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },

  filterDivider: {
    width: 1,
    backgroundColor: colors.border,
  },

  filterBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  sortDropdown: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    zIndex: 100,
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  sortOptionActive: {
    backgroundColor: colors.backgroundTertiary,
  },

  sortOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },

  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  listContent: {
    padding: spacing.sm,
  },

  productCard: {
    flex: 1,
    padding: spacing.xs,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.massive,
  },

  emptyTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },

  emptySubtitle: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
