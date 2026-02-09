import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ProductCard } from '../../components';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList, Product } from '../../types';
import { productService } from '../../services/productService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const recentSearches = [
  'T-shirts',
  'Nike shoes',
  'Formal shirts',
  'Jeans',
  'Kurtas',
  'Watches',
];

const trendingSearches = [
  'Summer dresses',
  'Running shoes',
  'Ethnic wear',
  'Casual shoes',
  'Party wear',
  'Sunglasses',
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const initialQuery = (route.params as any)?.query || '';

  const [searchText, setSearchText] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Search products from Supabase when search text changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchText.length >= 2) {
        setLoading(true);
        const result = await productService.searchProducts(searchText);
        setSearchResults(result.products);
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimeout);
  }, [searchText]);

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      setIsSearching(true);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchText(suggestion);
    setIsSearching(true);
  };

  const handleClear = () => {
    setSearchText('');
    setIsSearching(false);
  };

  const renderSearchSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      {/* Recent Searches */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <TouchableOpacity>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {recentSearches.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tag}
              onPress={() => handleSuggestionPress(item)}
            >
              <Icon name="history" size={16} color={colors.textTertiary} />
              <Text style={styles.tagText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trending Searches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending Searches</Text>
        <View style={styles.tagsContainer}>
          {trendingSearches.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tag}
              onPress={() => handleSuggestionPress(item)}
            >
              <Icon name="trending-up" size={16} color={colors.primary} />
              <Text style={styles.tagText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderResults = () => (
    <FlatList
      data={searchResults}
      keyExtractor={item => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <View style={styles.productCard}>
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item.id)}
          />
        </View>
      )}
      contentContainerStyle={styles.resultsList}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Icon name="search-off" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with different keywords
          </Text>
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Search Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={text => {
              setSearchText(text);
              setIsSearching(text.length >= 2);
            }}
            placeholder="Search for products, brands and more"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Icon name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Count */}
      {isSearching && searchResults.length > 0 && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {searchResults.length} results for "{searchText}"
          </Text>
        </View>
      )}

      {/* Content */}
      {isSearching ? renderResults() : renderSearchSuggestions()}
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },

  backButton: {
    padding: spacing.xs,
  },

  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },

  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  suggestionsContainer: {
    flex: 1,
    padding: spacing.lg,
  },

  section: {
    marginBottom: spacing.xl,
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
    textTransform: 'uppercase',
  },

  clearText: {
    ...typography.label,
    color: colors.primary,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    gap: spacing.xs,
  },

  tagText: {
    ...typography.body,
    color: colors.textPrimary,
  },

  resultsHeader: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },

  resultsCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  resultsList: {
    padding: spacing.md,
  },

  productCard: {
    flex: 1,
    maxWidth: '50%',
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
