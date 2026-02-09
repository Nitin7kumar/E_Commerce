import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WishlistItemCard, Button } from '../../components';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList } from '../../types';
import { useWishlistStore, useBagStore } from '../../store';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { items } = useWishlistStore();
  const { addItem } = useBagStore();

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const handleAddToBag = (productId: string) => {
    const item = items.find(i => i.product.id === productId);
    if (item && item.product.inStock) {
      const defaultSize = item.product.sizes.find(s => s.available)?.label || 'M';
      const defaultColor = item.product.colors.find(c => c.available)?.name || 'Default';
      addItem(item.product, defaultSize, defaultColor);
    }
  };

  const handleContinueShopping = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{
          name: 'Main',
          state: { routes: [{ name: 'HomeTab' }], index: 0 },
        }],
      })
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.headerTitle}>Wishlist</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="favorite-border" size={80} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Save items that you like in your wishlist.{'\n'}
            Review them anytime and easily move them to the bag.
          </Text>
          <Button
            title="Continue Shopping"
            onPress={handleContinueShopping}
            style={styles.continueButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <Text style={styles.itemCount}>{items.length} items</Text>
      </View>

      {/* Wishlist Items */}
      <FlatList
        data={items}
        keyExtractor={item => item.product.id}
        renderItem={({ item }) => (
          <WishlistItemCard
            product={item.product}
            onPress={() => handleProductPress(item.product.id)}
            onAddToBag={() => handleAddToBag(item.product.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  itemCount: {
    ...typography.body,
    color: colors.textTertiary,
  },

  listContent: {
    flexGrow: 1,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  emptyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginTop: spacing.xl,
  },

  emptySubtitle: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },

  continueButton: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
});
