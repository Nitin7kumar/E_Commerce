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
  Modal,
  Pressable,
  Linking,
  Animated,
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
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

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
            onPress={() => setShowComingSoonModal(true)}
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
            onPress={() => setShowHelpModal(true)}
          />
          <MenuItem
            icon="info-outline"
            title="About"
            onPress={() => setShowAboutModal(true)}
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

      {/* ─── About Modal ─── */}
      <Modal
        visible={showAboutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAboutModal(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            {/* Drag Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About</Text>
              <TouchableOpacity
                onPress={() => setShowAboutModal(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* App Icon / Branding */}
            <View style={styles.aboutBrandContainer}>
              <View style={styles.aboutIconCircle}>
                <Icon name="shopping-bag" size={36} color={colors.white} />
              </View>
              <Text style={styles.aboutAppName}>E-Commerce App</Text>
              <View style={styles.aboutVersionBadge}>
                <Text style={styles.aboutVersionText}>v1.0.0</Text>
              </View>
            </View>

            {/* Info Cards */}
            <View style={styles.aboutInfoSection}>
              <View style={styles.aboutInfoRow}>
                <View style={styles.aboutInfoIconWrap}>
                  <Icon name="code" size={18} color={colors.primary} />
                </View>
                <View style={styles.aboutInfoTextWrap}>
                  <Text style={styles.aboutInfoLabel}>Built with</Text>
                  <Text style={styles.aboutInfoValue}>React Native & Supabase</Text>
                </View>
              </View>
              <View style={styles.aboutInfoDivider} />
              <View style={styles.aboutInfoRow}>
                <View style={styles.aboutInfoIconWrap}>
                  <Icon name="security" size={18} color={colors.primary} />
                </View>
                <View style={styles.aboutInfoTextWrap}>
                  <Text style={styles.aboutInfoLabel}>Security</Text>
                  <Text style={styles.aboutInfoValue}>End-to-end encryption</Text>
                </View>
              </View>
              <View style={styles.aboutInfoDivider} />
              <View style={styles.aboutInfoRow}>
                <View style={styles.aboutInfoIconWrap}>
                  <Icon name="favorite" size={18} color={colors.primary} />
                </View>
                <View style={styles.aboutInfoTextWrap}>
                  <Text style={styles.aboutInfoLabel}>Made with</Text>
                  <Text style={styles.aboutInfoValue}>Love in India 🇮🇳</Text>
                </View>
              </View>
            </View>

            <Text style={styles.aboutCopyright}>
              © 2026 E-Commerce App. All rights reserved.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.modalPrimaryButtonText}>Got it!</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Help & Support Modal ─── */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowHelpModal(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            {/* Drag Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Support Options */}
            <TouchableOpacity
              style={styles.helpOptionCard}
              onPress={() => Linking.openURL('mailto:support@example.com')}
            >
              <View style={[styles.helpOptionIcon, { backgroundColor: colors.primaryLight + '20' }]}>
                <Icon name="email" size={22} color={colors.primary} />
              </View>
              <View style={styles.helpOptionContent}>
                <Text style={styles.helpOptionTitle}>Email Us</Text>
                <Text style={styles.helpOptionSubtitle}>support@example.com</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpOptionCard}
              onPress={() => Linking.openURL('tel:+911234567890')}
            >
              <View style={[styles.helpOptionIcon, { backgroundColor: colors.successLight }]}>
                <Icon name="phone" size={22} color={colors.success} />
              </View>
              <View style={styles.helpOptionContent}>
                <Text style={styles.helpOptionTitle}>Call Us</Text>
                <Text style={styles.helpOptionSubtitle}>+91 123 456 7890</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpOptionCard}>
              <View style={[styles.helpOptionIcon, { backgroundColor: colors.warningLight }]}>
                <Icon name="chat-bubble-outline" size={22} color={colors.warning} />
              </View>
              <View style={styles.helpOptionContent}>
                <Text style={styles.helpOptionTitle}>Live Chat</Text>
                <Text style={styles.helpOptionSubtitle}>Available 9 AM – 9 PM</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpOptionCard}>
              <View style={[styles.helpOptionIcon, { backgroundColor: colors.infoLight }]}>
                <Icon name="help-outline" size={22} color={colors.info} />
              </View>
              <View style={styles.helpOptionContent}>
                <Text style={styles.helpOptionTitle}>FAQs</Text>
                <Text style={styles.helpOptionSubtitle}>Browse common questions</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.modalPrimaryButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Coming Soon Modal ─── */}
      <Modal
        visible={showComingSoonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComingSoonModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowComingSoonModal(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            {/* Drag Handle */}
            <View style={styles.modalHandle} />

            {/* Illustration */}
            <View style={styles.comingSoonIllustration}>
              <View style={styles.comingSoonIconOuter}>
                <View style={styles.comingSoonIconInner}>
                  <Icon name="credit-card" size={40} color={colors.primary} />
                </View>
              </View>
            </View>

            <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
            <Text style={styles.comingSoonDesc}>
              We're working hard to bring you card management.{' '}
              Stay tuned for a seamless payment experience!
            </Text>

            {/* Feature Preview */}
            <View style={styles.comingSoonFeatures}>
              {[
                { icon: 'add-card', text: 'Save multiple cards' },
                { icon: 'lock', text: 'Secure tokenized storage' },
                { icon: 'flash-on', text: 'One-tap checkout' },
              ].map((feature, index) => (
                <View key={index} style={styles.comingSoonFeatureRow}>
                  <Icon name={feature.icon} size={18} color={colors.success} />
                  <Text style={styles.comingSoonFeatureText}>{feature.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setShowComingSoonModal(false)}
            >
              <Text style={styles.modalPrimaryButtonText}>Sounds Great!</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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

  // ─── Shared Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },

  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.lg,
  },

  modalTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalPrimaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },

  modalPrimaryButtonText: {
    ...typography.button,
    color: colors.white,
    textTransform: 'none',
    letterSpacing: 0.3,
  },

  // ─── About Modal ───
  aboutBrandContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },

  aboutIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  aboutAppName: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  aboutVersionBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  aboutVersionText: {
    ...typography.label,
    color: colors.textSecondary,
  },

  aboutInfoSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },

  aboutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  aboutInfoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  aboutInfoTextWrap: {
    flex: 1,
  },

  aboutInfoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  aboutInfoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  aboutInfoDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },

  aboutCopyright: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  // ─── Help & Support Modal ───
  helpOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },

  helpOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  helpOptionContent: {
    flex: 1,
  },

  helpOptionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  helpOptionSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ─── Coming Soon Modal ───
  comingSoonIllustration: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  comingSoonIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  comingSoonIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  comingSoonTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  comingSoonDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  comingSoonFeatures: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.md,
  },

  comingSoonFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  comingSoonFeatureText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
