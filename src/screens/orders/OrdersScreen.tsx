import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Button, Badge, ReturnModal } from '../../components';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ProfileStackParamList, RootStackParamList, Order, OrderStatus, CartItem } from '../../types';
import { useUserStore } from '../../store';
import { orderService } from '../../services';
import { reviewService, DBReview } from '../../services/reviewService';
import { isSupabaseConfigured } from '../../config/supabase';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList & RootStackParamList>;

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'delivered':
      return colors.success;
    case 'cancelled':
    case 'returned':
      return colors.error;
    case 'shipped':
    case 'out_for_delivery':
      return colors.info;
    default:
      return colors.secondary;
  }
};

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return 'Order Placed';
    case 'confirmed':
      return 'Confirmed';
    case 'shipped':
      return 'Shipped';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'returned':
      return 'Returned';
    default:
      return status;
  }
};

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { orders: localOrders, isLoggedIn } = useUserStore();
  const [orders, setOrders] = useState<Order[]>(localOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = useCallback(async (showRefreshIndicator = false) => {
    console.log('📋 OrdersScreen: fetchOrders called');
    console.log('📋 OrdersScreen: isLoggedIn =', isLoggedIn);
    console.log('📋 OrdersScreen: isSupabaseConfigured =', isSupabaseConfigured());
    console.log('📋 OrdersScreen: localOrders count =', localOrders.length);

    if (isLoggedIn && isSupabaseConfigured()) {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await orderService.getOrders();
        console.log('📋 OrdersScreen: Got result from orderService');
        console.log('📋 OrdersScreen: Database orders count =', result.orders.length);
        console.log('📋 OrdersScreen: Error =', result.error || 'none');

        // Always use database orders when Supabase is configured
        // This ensures we show the correct orders for the logged-in user
        setOrders(result.orders);

        // Also sync to local store if we got orders from database
        // This is handled by the store already when orders are created
      } catch (error) {
        console.error('📋 OrdersScreen: Failed to fetch orders:', error);
        // On error, still try to show local orders
        setOrders(localOrders);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    } else {
      console.log('📋 OrdersScreen: Using local orders (Supabase not configured or not logged in)');
      setOrders(localOrders);
    }
  }, [isLoggedIn, localOrders]);

  // Fetch orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Update orders when local orders change
  useEffect(() => {
    if (!isLoggedIn || !isSupabaseConfigured()) {
      setOrders(localOrders);
    }
  }, [localOrders, isLoggedIn]);

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="receipt-long" size={80} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Looks like you haven't placed any orders yet.
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

  const renderOrderItem = ({ item }: { item: Order }) => {
    const firstItem = item.items[0];
    const itemCount = item.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item.id)}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id.slice(-8)}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          <Badge
            text={getStatusLabel(item.status)}
            variant={item.status === 'delivered' ? 'success' : 'info'}
          />
        </View>

        <View style={styles.orderContent}>
          <Image
            source={{ uri: firstItem.product.images[0] }}
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productBrand}>{firstItem.product.brand}</Text>
            <Text style={styles.productName} numberOfLines={1}>
              {firstItem.product.name}
            </Text>
            {itemCount > 1 && (
              <Text style={styles.moreItems}>
                +{itemCount - 1} more item{itemCount > 2 ? 's' : ''}
              </Text>
            )}
            <Text style={styles.orderTotal}>
              ₹{item.totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

export const OrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params as { orderId: string };
  const { getOrderById } = useUserStore();

  const [order, setOrder] = useState<Order | null>(getOrderById(orderId) || null);
  const [isLoading, setIsLoading] = useState(!order);
  const [error, setError] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState<string | null>(null);
  const [productReviews, setProductReviews] = useState<Record<string, DBReview>>({});

  // Fetch existing reviews for order items
  const fetchProductReviews = useCallback(async () => {
    if (!order) return;

    const reviews: Record<string, DBReview> = {};
    for (const item of order.items) {
      const result = await reviewService.getUserReview(item.product.id);
      if (result.review) {
        reviews[item.product.id] = result.review;
      }
    }
    setProductReviews(reviews);
  }, [order]);

  // Refetch reviews when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProductReviews();
    }, [fetchProductReviews])
  );

  // Fetch order from database if not in local store
  useEffect(() => {
    const fetchOrder = async () => {
      if (order) return; // Already have order

      if (isSupabaseConfigured()) {
        setIsLoading(true);
        try {
          const result = await orderService.getOrderById(orderId);
          if (result.order) {
            setOrder(result.order);
          } else {
            setError(result.error || 'Order not found');
          }
        } catch (err) {
          setError('Failed to load order');
        } finally {
          setIsLoading(false);
        }
      } else {
        setError('Order not found');
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, order]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="error-outline" size={60} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Order not found</Text>
          <Text style={styles.emptySubtitle}>{error || 'Unable to load order details'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <FlatList
        data={order.items}
        keyExtractor={(item, index) => `${item.product.id}-${index}`}
        ListHeaderComponent={() => (
          <>
            {/* Order Status */}
            <View style={styles.statusSection}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>Order Status</Text>
                <Badge
                  text={getStatusLabel(order.status)}
                  variant={order.status === 'delivered' ? 'success' : 'info'}
                />
              </View>
              <Text style={styles.statusDate}>
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            {/* Delivery Address */}
            <View style={styles.addressSection}>
              <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
              <Text style={styles.addressName}>{order.address.name}</Text>
              <Text style={styles.addressText}>
                {order.address.address}, {order.address.locality}
              </Text>
              <Text style={styles.addressText}>
                {order.address.city}, {order.address.state} - {order.address.pincode}
              </Text>
              <Text style={styles.addressPhone}>Phone: {order.address.phone}</Text>
            </View>

            <Text style={styles.itemsTitle}>ORDER ITEMS</Text>
          </>
        )}
        renderItem={({ item }) => {
          const existingReview = productReviews[item.product.id];
          const hasReview = !!existingReview;

          return (
            <View style={styles.orderItemCard}>
              <Image
                source={{ uri: item.product.images[0] }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemBrand}>{item.product.brand}</Text>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemVariant}>
                  Size: {item.selectedSize} | Color: {item.selectedColor}
                </Text>
                <Text style={styles.itemPrice}>
                  ₹{item.product.price.toLocaleString('en-IN')} x {item.quantity}
                </Text>

                {/* Rating & Review Section - Only show for delivered orders */}
                {order.status === 'delivered' && (
                  <View style={styles.reviewSection}>
                    {/* Star Rating Display */}
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name={hasReview && star <= existingReview.rating ? 'star' : 'star-border'}
                          size={18}
                          color={hasReview && star <= existingReview.rating ? colors.star : colors.starEmpty}
                        />
                      ))}
                    </View>

                    {/* Write/Edit Review Button */}
                    <TouchableOpacity
                      style={styles.writeReviewButton}
                      onPress={() => {
                        navigation.navigate('WriteReview', {
                          productId: item.product.id,
                          orderId: orderId,
                          productName: item.product.name,
                          imageUrl: item.product.images[0],
                          existingReview: hasReview ? {
                            id: existingReview.id,
                            rating: existingReview.rating,
                            title: existingReview.title,
                            comment: existingReview.comment,
                            images: existingReview.images,
                          } : undefined,
                        });
                      }}
                    >
                      <Icon
                        name={hasReview ? 'edit' : 'rate-review'}
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.writeReviewText}>
                        {hasReview ? 'Edit Review' : 'Write a Review'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Return/Replace Button */}
                {order.status === 'delivered' && (
                  <TouchableOpacity
                    style={styles.returnItemButton}
                    onPress={() => {
                      setSelectedItemForReturn(item.product.name);
                      setShowReturnModal(true);
                    }}
                  >
                    <Icon name="assignment-return" size={16} color={colors.primary} />
                    <Text style={styles.returnItemText}>Return / Replace</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>PRICE DETAILS</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₹{(order.totalAmount - order.deliveryCharge + order.discount).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.discountValue}>
                -₹{order.discount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={order.deliveryCharge === 0 ? styles.freeText : styles.summaryValue}>
                {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₹{order.totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <Text style={styles.paymentMethod}>
              Payment: {order.paymentMethod}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Return Modal */}
      <ReturnModal
        visible={showReturnModal}
        orderId={orderId}
        productName={selectedItemForReturn || undefined}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedItemForReturn(null);
        }}
        onSubmit={() => {
          // Show success message and refresh
        }}
      />
    </View>
  );
};

export const OrderSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };

  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleViewOrder = () => {
    // Navigate to Main, then push into ProfileStack > Orders
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' },
        { name: 'ProfileStack', params: { screen: 'Orders' } },
      ],
    });
  };

  return (
    <View style={styles.successContainer}>
      <View style={styles.successContent}>
        <View style={styles.successIcon}>
          <Icon name="check-circle" size={80} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Order Placed!</Text>
        <Text style={styles.successMessage}>
          Your order has been successfully placed.{'\n'}
          Order ID: {orderId}
        </Text>
        <Text style={styles.successSubtext}>
          You will receive a confirmation email shortly.
        </Text>
      </View>

      <View style={styles.successActions}>
        <Button
          title="VIEW ORDER"
          variant="outline"
          onPress={handleViewOrder}
          style={styles.viewOrderButton}
        />
        <Button
          title="CONTINUE SHOPPING"
          onPress={handleContinueShopping}
          style={styles.continueButton}
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

  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  listContent: {
    paddingBottom: spacing.xxl,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.white,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  },

  continueButton: {
    marginTop: spacing.xl,
    minWidth: 200,
  },

  orderCard: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    padding: spacing.lg,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },

  orderId: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  orderDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

  orderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  productImage: {
    width: 60,
    height: 80,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
  },

  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  productBrand: {
    ...typography.label,
    color: colors.textPrimary,
  },

  productName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  moreItems: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

  orderTotal: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  // Order Details styles
  statusSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
  },

  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  statusDate: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  addressSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },

  sectionTitle: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  addressName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
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

  itemsTitle: {
    ...typography.label,
    color: colors.textTertiary,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },

  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: 1,
  },

  itemImage: {
    width: 70,
    height: 90,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
  },

  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  itemBrand: {
    ...typography.label,
    color: colors.textPrimary,
  },

  itemName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  itemVariant: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  itemPrice: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },

  summarySection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginTop: spacing.sm,
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

  paymentMethod: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },

  // Success screen styles
  successContainer: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    padding: spacing.xl,
  },

  successContent: {
    alignItems: 'center',
  },

  successIcon: {
    marginBottom: spacing.xl,
  },

  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  successSubtext: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.lg,
  },

  successActions: {
    marginTop: spacing.xxxl,
    gap: spacing.md,
  },

  viewOrderButton: {
    marginBottom: spacing.sm,
  },

  returnItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },

  returnItemText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // Review section styles
  reviewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primaryLight + '15',
    borderRadius: borderRadius.sm,
  },

  writeReviewText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
