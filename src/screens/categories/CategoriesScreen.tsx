import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { CategoriesStackParamList } from '../../types';
import { categories } from '../../mocks/fixtures';

type NavigationProp = NativeStackNavigationProp<CategoriesStackParamList>;

export const CategoriesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('CategoryLanding', { categoryId });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shop by Category</Text>
        <View style={styles.headerBackButton} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(category.id)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: category.image }} style={styles.categoryImage} />
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.subcategoryCount}>
                {category.subcategories.length} subcategories
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

export const CategoryLandingScreen: React.FC<{ route: any }> = ({ route }) => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { categoryId } = route.params;
  const category = categories.find(c => c.id === categoryId);

  if (!category) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Category not found</Text>
      </View>
    );
  }

  const handleSubcategoryPress = (subcategoryId: string, name: string) => {
    navigation.navigate('ProductList', { subcategoryId, title: name });
  };

  // Get icon based on subcategory name
  const getSubcategoryIcon = (name: string): string => {
    const iconMap: Record<string, string> = {
      'T-Shirts': 'checkroom',
      'Casual Shirts': 'dry-cleaning',
      'Formal Shirts': 'work-outline',
      'Jeans': 'straighten',
      'Trousers': 'straighten',
      'Shorts': 'weekend',
      'Jackets': 'layers',
      'Sweaters': 'ac-unit',
      'Activewear': 'fitness-center',
      'Innerwear': 'inbox',
      'Dresses': 'style',
      'Tops': 'style',
      'Kurtas & Suits': 'diamond',
      'Sarees': 'diamond',
      'Skirts': 'style',
      'Leggings': 'straighten',
      'Lingerie': 'favorite',
      'Casual Shoes': 'directions-walk',
      'Sports Shoes': 'directions-run',
      'Formal Shoes': 'work-outline',
      'Sandals': 'beach-access',
      'Heels': 'stairs',
      'Flats': 'horizontal-rule',
      'Sneakers': 'directions-run',
      'Watches': 'watch',
      'Sunglasses': 'visibility',
      'Bags': 'shopping-bag',
      'Belts': 'horizontal-rule',
      'Wallets': 'account-balance-wallet',
      'Jewellery': 'diamond',
      'Makeup': 'brush',
      'Skincare': 'spa',
      'Haircare': 'face',
      'Fragrances': 'air',
      'Grooming': 'content-cut',
    };
    return iconMap[name] || 'category';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ===== SEPARATE HEADER BAR ===== */}
      <View style={[styles.landingHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.landingBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.landingHeaderTitle}>{category.name}</Text>
        <View style={styles.landingBackButton} />
      </View>

      {/* ===== BANNER IMAGE (Below Header) ===== */}
      <View style={styles.categoryBanner}>
        <Image source={{ uri: category.image }} style={styles.bannerImage} />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{category.name}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Explore {category.name}</Text>

        <View style={styles.subcategoryGrid}>
          {category.subcategories.map((subcategory, index) => (
            <TouchableOpacity
              key={subcategory.id}
              style={styles.subcategoryCard}
              onPress={() => handleSubcategoryPress(subcategory.id, subcategory.name)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.subcategoryIconContainer,
                { backgroundColor: index % 2 === 0 ? '#FFF0F3' : '#F0F4FF' }
              ]}>
                <Icon
                  name={getSubcategoryIcon(subcategory.name)}
                  size={28}
                  color={index % 2 === 0 ? colors.primary : '#5B7FFF'}
                />
              </View>
              <Text style={styles.subcategoryName} numberOfLines={2}>
                {subcategory.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  content: {
    flex: 1,
  },

  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.backgroundSecondary,
  },

  categoryInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  categoryName: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  subcategoryCount: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

  // ===== CATEGORY LANDING HEADER =====
  landingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  landingBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  landingHeaderTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // ===== CATEGORY BANNER =====
  categoryBanner: {
    height: 150,
    position: 'relative',
  },

  bannerImage: {
    width: '100%',
    height: '100%',
  },

  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bannerTitle: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '700',
  },

  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  subcategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },

  subcategoryCard: {
    width: '33.33%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },

  subcategoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  subcategoryName: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '500',
  },

  bottomSpacer: {
    height: spacing.huge,
  },
});
