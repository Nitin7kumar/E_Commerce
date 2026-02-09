import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ProfileStackParamList } from '../../types';
import { useUserStore, useBagStore, useWishlistStore } from '../../store';
import { authService } from '../../services';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showBadge,
  badgeCount,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Icon name={icon} size={24} color={colors.textSecondary} />
    <View style={styles.menuItemContent}>
      <Text style={styles.menuItemTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
    </View>
    {showBadge && badgeCount !== undefined && badgeCount > 0 && (
      <View style={styles.menuBadge}>
        <Text style={styles.menuBadgeText}>{badgeCount}</Text>
      </View>
    )}
    <Icon name="chevron-right" size={24} color={colors.textTertiary} />
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, orders, logout } = useUserStore();
  const bagItems = useBagStore(state => state.getTotalItems());
  const wishlistCount = useWishlistStore(state => state.getItemCount());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogin = () => {
    // Navigate to auth flow
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              const result = await authService.signOut();
              if (result.success) {
                logout();
              } else {
                Alert.alert('Error', result.error || 'Failed to log out');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleOrders = () => {
    navigation.navigate('Orders');
  };

  const handleBag = () => {
    navigation.navigate('Bag');
  };

  const handleAddresses = () => {
    navigation.navigate('Addresses');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleCoupons = () => {
    navigation.navigate('Coupons');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={[styles.safeArea, { paddingTop: insets.top }]} />

      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          {isLoggedIn && user ? (
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                {user.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <TouchableOpacity onPress={handleEditProfile}>
                  <Text style={styles.editProfile}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.guestContainer}>
              <Icon name="account-circle" size={64} color={colors.textTertiary} />
              <Text style={styles.guestTitle}>Hey! Login to get started</Text>
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>LOG IN / SIGN UP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} onPress={handleOrders}>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              // Navigate to Wishlist tab - need to reset to Main and focus WishlistTab
              // ProfileStack is a sibling of Main in RootStack
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Main' as never,
                      state: {
                        routes: [
                          { name: 'HomeTab' },
                          { name: 'CategoriesTab' },
                          { name: 'SearchTab' },
                          { name: 'WishlistTab' },
                          { name: 'BagTab' },
                        ],
                        index: 3, // WishlistTab is at index 3
                      },
                    },
                  ],
                })
              );
            }}
          >
            <Text style={styles.statValue}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={handleBag}>
            <Text style={styles.statValue}>{bagItems}</Text>
            <Text style={styles.statLabel}>Bag</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="shopping-bag"
            title="Orders"
            subtitle="Check your order status"
            onPress={handleOrders}
          />
          <MenuItem
            icon="local-mall"
            title="Shopping Bag"
            onPress={handleBag}
            showBadge
            badgeCount={bagItems}
          />
          <MenuItem
            icon="location-on"
            title="Saved Addresses"
            subtitle="Manage your addresses"
            onPress={handleAddresses}
          />
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon="local-offer"
            title="Coupons"
            subtitle="View all coupons"
            onPress={handleCoupons}
          />
          <MenuItem
            icon="credit-card"
            title="Saved Cards"
            subtitle="Manage payment methods"
            onPress={() => {
              Alert.alert('Coming Soon', 'Card management will be available soon!');
            }}
          />
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon="settings"
            title="Settings"
            onPress={handleSettings}
          />
          <MenuItem
            icon="help-outline"
            title="Help & Support"
            onPress={() => {
              Alert.alert('Help & Support', 'Contact us at support@example.com');
            }}
          />
          <MenuItem
            icon="info-outline"
            title="About"
            onPress={() => {
              Alert.alert('About', 'E-Commerce App v1.0.0\n\nBuilt with React Native & Supabase');
            }}
          />
        </View>

        {isLoggedIn && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Icon name="logout" size={20} color={colors.error} />
            )}
            <Text style={styles.logoutText}>
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  safeArea: {
    backgroundColor: colors.white,
  },

  scrollView: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },

  header: {
    backgroundColor: colors.white,
    padding: spacing.xl,
  },

  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarContainer: {
    marginRight: spacing.lg,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    ...typography.h3,
    color: colors.white,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  userEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },

  editProfile: {
    ...typography.label,
    color: colors.primary,
    marginTop: spacing.sm,
  },

  guestContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },

  guestTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },

  loginButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
  },

  loginButtonText: {
    ...typography.button,
    color: colors.primary,
  },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },

  menuSection: {
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  menuItemContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  menuItemTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },

  menuItemSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xxs,
  },

  menuBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  menuBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    padding: spacing.lg,
    gap: spacing.sm,
  },

  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: spacing.huge,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topHeaderTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },
});
