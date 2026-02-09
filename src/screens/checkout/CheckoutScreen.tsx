import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button } from '../../components';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { RootStackParamList, Address, Order } from '../../types';
import { useBagStore, useUserStore } from '../../store';
import { orderService, addressService } from '../../services';
import { isSupabaseConfigured } from '../../config/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { items, getTotalPrice, getTotalDiscount, clearBag } = useBagStore();
  const { addresses: localAddresses, getDefaultAddress, addOrder, isLoggedIn } = useUserStore();

  const [addresses, setAddresses] = useState<Address[]>(localAddresses);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card'>('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Fetch addresses from Supabase when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchAddresses = async () => {
        if (isSupabaseConfigured()) {
          setIsLoadingAddresses(true);
          try {
            const result = await addressService.getAddresses();
            if (!result.error && result.addresses.length > 0) {
              setAddresses(result.addresses);
              // Auto-select default address or first address
              const defaultAddr = result.addresses.find(a => a.isDefault) || result.addresses[0];
              setSelectedAddress(defaultAddr);
            } else {
              // Fallback to local addresses
              setAddresses(localAddresses);
              setSelectedAddress(getDefaultAddress());
            }
          } catch (error) {
            console.error('Failed to fetch addresses:', error);
            setAddresses(localAddresses);
            setSelectedAddress(getDefaultAddress());
          } finally {
            setIsLoadingAddresses(false);
          }
        } else {
          setAddresses(localAddresses);
          setSelectedAddress(getDefaultAddress());
        }
      };
      fetchAddresses();
    }, [localAddresses])
  );

  const totalPrice = getTotalPrice();
  const totalDiscount = getTotalDiscount();
  const deliveryCharge = totalPrice >= 999 ? 0 : 99;
  const finalAmount = totalPrice + deliveryCharge;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty Bag', 'Your bag is empty');
      return;
    }

    setIsPlacingOrder(true);

    try {
      console.log('=== ORDER DEBUG ===');
      console.log('isLoggedIn (local store):', isLoggedIn);
      console.log('isSupabaseConfigured:', isSupabaseConfigured());
      console.log('items count:', items.length);
      console.log('selectedAddress:', selectedAddress);

      // Always try to create order in Supabase if configured
      if (isSupabaseConfigured()) {
        console.log('Supabase is configured, attempting to create order in database...');
        const result = await orderService.createOrder({
          items: [...items],
          address: selectedAddress,
          paymentMethod: paymentMethod,
          subtotal: totalPrice + totalDiscount,
          discount: totalDiscount,
          deliveryCharge,
          totalAmount: finalAmount,
        });

        console.log('Order result:', JSON.stringify(result, null, 2));

        if (result.success && result.order) {
          // Add to local store for immediate UI update
          addOrder(result.order);
          clearBag();

          // Navigate to success screen
          navigation.navigate('OrderSuccess', { orderId: result.order.id });
          return;
        } else {
          console.error('Order creation failed:', result.error);
          // Show specific error to user
          Alert.alert(
            'Order Failed', 
            result.error || 'Failed to place order. Please try again.',
            [
              { text: 'OK' },
              { 
                text: 'Use Offline Mode', 
                onPress: () => createLocalOrder() 
              }
            ]
          );
          return;
        }
      } else {
        console.log('Supabase not configured, using local-only order');
        createLocalOrder();
      }
    } catch (error) {
      console.error('Place order exception:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const createLocalOrder = () => {
    // Fallback to local-only order
    const order: Order = {
      id: `ORD${Date.now()}`,
      items: [...items],
      totalAmount: finalAmount,
      discount: totalDiscount,
      deliveryCharge,
      address: selectedAddress!,
      status: 'confirmed',
      createdAt: Date.now(),
      estimatedDelivery: Date.now() + 5 * 24 * 60 * 60 * 1000,
      paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment',
    };

    addOrder(order);
    clearBag();
    navigation.navigate('OrderSuccess', { orderId: order.id });
  };

  const handleAddAddress = () => {
    navigation.navigate('AddAddress', {});
  };

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
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>

          {isLoadingAddresses ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.sm }}>Loading addresses...</Text>
            </View>
          ) : addresses.length === 0 ? (
            <TouchableOpacity style={styles.addAddressCard} onPress={handleAddAddress}>
              <Icon name="add-location" size={24} color={colors.primary} />
              <Text style={styles.addAddressText}>Add Delivery Address</Text>
            </TouchableOpacity>
          ) : (
            <>
              {addresses.map(address => (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressCard,
                    selectedAddress?.id === address.id && styles.addressCardSelected,
                  ]}
                  onPress={() => setSelectedAddress(address)}
                >
                  <View style={styles.addressRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedAddress?.id === address.id && styles.radioOuterSelected,
                      ]}
                    >
                      {selectedAddress?.id === address.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </View>
                  <View style={styles.addressContent}>
                    <View style={styles.addressHeader}>
                      <Text style={styles.addressName}>{address.name}</Text>
                      <View style={styles.addressTypeBadge}>
                        <Text style={styles.addressTypeText}>
                          {address.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.addressText}>
                      {address.address}, {address.locality}
                    </Text>
                    <Text style={styles.addressText}>
                      {address.city}, {address.state} - {address.pincode}
                    </Text>
                    <Text style={styles.addressPhone}>Mobile: {address.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addMoreButton} onPress={handleAddAddress}>
                <Icon name="add" size={18} color={colors.primary} />
                <Text style={styles.addMoreText}>Add New Address</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cod' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('cod')}
          >
            <View style={styles.paymentRadio}>
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === 'cod' && styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === 'cod' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Icon name="payments" size={24} color={colors.textSecondary} />
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentSubtitle}>Pay when you receive</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'card' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <View style={styles.paymentRadio}>
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === 'card' && styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === 'card' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Icon name="credit-card" size={24} color={colors.textSecondary} />
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Pay Online</Text>
              <Text style={styles.paymentSubtitle}>Cards, UPI, Wallets</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Bag Total ({items.length} items)
              </Text>
              <Text style={styles.summaryValue}>
                ₹{(totalPrice + totalDiscount).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.discountValue}>
                -₹{totalDiscount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={deliveryCharge === 0 ? styles.freeText : styles.summaryValue}>
                {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₹{finalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomTotal}>
            ₹{finalAmount.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.bottomItems}>{items.length} Items</Text>
        </View>
        {isPlacingOrder ? (
          <View style={[styles.placeOrderButton, styles.loadingButton]}>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.loadingText}>Placing Order...</Text>
          </View>
        ) : (
          <Button
            title="PLACE ORDER"
            onPress={handlePlaceOrder}
            disabled={!selectedAddress || items.length === 0}
            style={styles.placeOrderButton}
          />
        )}
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

  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  content: {
    flex: 1,
  },

  section: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  addAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },

  addAddressText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  addressCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },

  addressCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
  },

  addressRadio: {
    marginRight: spacing.md,
    paddingTop: spacing.xxs,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  addressContent: {
    flex: 1,
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  addressName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  addressTypeBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
  },

  addressTypeText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
  },

  addressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  addressPhone: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },

  addMoreText: {
    ...typography.label,
    color: colors.primary,
  },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },

  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
  },

  paymentRadio: {
    marginRight: spacing.xs,
  },

  paymentContent: {
    flex: 1,
  },

  paymentTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  paymentSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  summaryCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
  },

  discountValue: {
    ...typography.body,
    color: colors.success,
  },

  freeText: {
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
    borderTopColor: colors.border,
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

  bottomItems: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  placeOrderButton: {
    flex: 1,
  },

  loadingButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },

  loadingText: {
    ...typography.button,
    color: colors.white,
  },
});
