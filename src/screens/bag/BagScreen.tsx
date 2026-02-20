import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BagItemCard, Button, Price } from '../../components';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList } from '../../types';
import { useBagStore } from '../../store';
import { useCouponValidation } from '../../services/couponService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const BagScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { items, getTotalPrice, getTotalDiscount, getTotalItems } = useBagStore();

  const totalPrice = getTotalPrice();
  const totalDiscount = getTotalDiscount();
  const totalMRP = totalPrice + totalDiscount;
  const deliveryCharge = totalPrice >= 999 ? 0 : 99;

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const { validateCoupon, removeCoupon, appliedCoupon, isValidating, error: couponError } = useCouponValidation();

  const couponDiscount = appliedCoupon?.discount || 0;
  const finalAmount = totalPrice + deliveryCharge - couponDiscount;

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

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      Alert.alert('Empty Bag', 'Your bag is empty');
      return;
    }

    // Navigate to Checkout screen for address selection & order confirmation
    navigation.navigate('Checkout');
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.headerTitle}>Shopping Bag</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="shopping-bag" size={80} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptySubtitle}>
            Looks like you haven't added anything to your bag.{'\n'}
            Let's change that.
          </Text>
          <Button
            title="Start Shopping"
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
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Shopping Bag</Text>
          <Text style={styles.itemCount}>{getTotalItems()} items</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          `${item.product.id}-${item.selectedSize}-${item.selectedColor}-${index}`
        }
        renderItem={({ item }) => (
          <BagItemCard
            item={item}
            onPress={() => navigation.navigate('ProductDetails', { productId: item.product.id })}
          />
        )}
        ListFooterComponent={() => (
          <>
            {/* Coupon Section */}
            <View style={styles.couponSection}>
              <View style={styles.couponInputRow}>
                <Icon name="local-offer" size={20} color={colors.primary} />
                <TextInput
                  style={styles.couponInput}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  placeholder="Enter promo code"
                  placeholderTextColor={colors.textTertiary}
                  editable={!appliedCoupon}
                  autoCapitalize="characters"
                />
                {appliedCoupon ? (
                  <TouchableOpacity
                    style={styles.removeCouponButton}
                    onPress={() => {
                      removeCoupon();
                      setCouponCode('');
                    }}
                  >
                    <Icon name="close" size={18} color={colors.error} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.applyCouponButton, !couponCode.trim() && styles.applyCouponButtonDisabled]}
                    onPress={() => validateCoupon(couponCode, totalPrice)}
                    disabled={!couponCode.trim() || isValidating}
                  >
                    {isValidating ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.applyCouponText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {appliedCoupon && (
                <View style={styles.couponApplied}>
                  <Icon name="check-circle" size={16} color={colors.success} />
                  <Text style={styles.couponAppliedText}>
                    '{appliedCoupon.code}' applied! You save ₹{appliedCoupon.discount.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
              {couponError && !appliedCoupon && (
                <View style={styles.couponError}>
                  <Icon name="error-outline" size={16} color={colors.error} />
                  <Text style={styles.couponErrorText}>{couponError}</Text>
                </View>
              )}
            </View>

            {/* Price Details */}
            <View style={styles.priceDetails}>
              <Text style={styles.priceDetailsTitle}>PRICE DETAILS ({items.length} Items)</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total MRP</Text>
                <Text style={styles.priceValue}>₹{totalMRP.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Discount on MRP</Text>
                <Text style={styles.discountValue}>-₹{totalDiscount.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Fee</Text>
                {deliveryCharge === 0 ? (
                  <Text style={styles.freeDelivery}>FREE</Text>
                ) : (
                  <Text style={styles.priceValue}>₹{deliveryCharge}</Text>
                )}
              </View>

              {couponDiscount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Coupon Discount</Text>
                  <Text style={styles.discountValue}>-₹{couponDiscount.toLocaleString('en-IN')}</Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{finalAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomTotal}>₹{finalAmount.toLocaleString('en-IN')}</Text>
          <TouchableOpacity>
            <Text style={styles.viewDetails}>View Details</Text>
          </TouchableOpacity>
        </View>
        <Button
          title="PLACE ORDER"
          onPress={handlePlaceOrder}
          style={styles.placeOrderButton}
        />
      </View>
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
    marginRight: spacing.sm,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  itemCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  listContent: {
    paddingBottom: spacing.lg,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.white,
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

  couponSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },

  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  couponInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  applyCouponButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    alignItems: 'center',
  },

  applyCouponButtonDisabled: {
    backgroundColor: colors.textDisabled,
  },

  applyCouponText: {
    ...typography.label,
    color: colors.white,
    fontWeight: '600',
  },

  removeCouponButton: {
    padding: spacing.sm,
  },

  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },

  couponAppliedText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
  },

  couponError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },

  couponErrorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },

  couponText: {
    ...typography.body,
    color: colors.primary,
    flex: 1,
    fontWeight: '600',
  },

  priceDetails: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },

  priceDetailsTitle: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  priceValue: {
    ...typography.body,
    color: colors.textPrimary,
  },

  discountValue: {
    ...typography.body,
    color: colors.success,
  },

  freeDelivery: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  totalLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  totalValue: {
    ...typography.price,
    color: colors.textPrimary,
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },

  bottomPrice: {
    flex: 1,
  },

  bottomTotal: {
    ...typography.price,
    color: colors.textPrimary,
  },

  viewDetails: {
    ...typography.caption,
    color: colors.primary,
  },

  placeOrderButton: {
    flex: 1,
  },
});
