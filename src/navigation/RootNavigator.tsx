import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  LoginScreen,
  SignupScreen,
  HomeScreen,
  CategoriesScreen,
  CategoryLandingScreen,
  SearchScreen,
  ProductListScreen,
  ProductDetailsScreen,
  WishlistScreen,
  BagScreen,
  ProfileScreen,
  EditProfileScreen,
  SettingsScreen,
  CouponsScreen,
  AddressesScreen,
  AddAddressScreen,
  CheckoutScreen,
  OrdersScreen,
  OrderDetailsScreen,
  OrderSuccessScreen,
  WriteReviewScreen,
} from '../screens';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useBagStore, useWishlistStore, useUserStore } from '../store';
import {
  RootStackParamList,
  MainTabParamList,
  HomeStackParamList,
  CategoriesStackParamList,
  ProfileStackParamList,
} from '../types';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { authService } from '../services';
import { isSupabaseConfigured } from '../config/supabase';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CategoriesStack = createNativeStackNavigator<CategoriesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Tab Badge Component
const TabBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

// Home Tab Navigator
const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="ProductList" component={ProductListScreen} />
      <HomeStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    </HomeStack.Navigator>
  );
};

// Categories Tab Navigator
const CategoriesStackNavigator: React.FC = () => {
  return (
    <CategoriesStack.Navigator screenOptions={{ headerShown: false }}>
      <CategoriesStack.Screen name="Categories" component={CategoriesScreen} />
      <CategoriesStack.Screen name="CategoryLanding" component={CategoryLandingScreen} />
      <CategoriesStack.Screen name="ProductList" component={ProductListScreen} />
    </CategoriesStack.Navigator>
  );
};

// Profile Tab Navigator (includes Bag, Orders, etc.)
const ProfileStackNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Coupons" component={CouponsScreen} />
      <ProfileStack.Screen name="Addresses" component={AddressesScreen} />
      <ProfileStack.Screen name="AddAddress" component={AddAddressScreen} />
      <ProfileStack.Screen name="Bag" component={BagScreen} />
      <ProfileStack.Screen name="Orders" component={OrdersScreen} />
      <ProfileStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <ProfileStack.Screen name="WriteReview" component={WriteReviewScreen} />
      <ProfileStack.Screen name="Checkout" component={CheckoutScreen} />
    </ProfileStack.Navigator>
  );
};

// Main Tab Navigator
const MainTabNavigator: React.FC = () => {
  const bagCount = useBagStore(state => state.getTotalItems());
  const wishlistCount = useWishlistStore(state => state.getItemCount());

  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontSize: 10,
        },
      }}
    >
      <MainTab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="CategoriesTab"
        component={CategoriesStackNavigator}
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color, size }) => (
            <Icon name="category" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Icon name="explore" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="WishlistTab"
        component={WishlistScreen}
        options={{
          tabBarLabel: 'Wishlist',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon name="favorite-border" size={size} color={color} />
              <TabBadge count={wishlistCount} />
            </View>
          ),
        }}
      />
      <MainTab.Screen
        name="BagTab"
        component={BagScreen}
        options={{
          tabBarLabel: 'Bag',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon name="shopping-bag" size={size} color={color} />
              <TabBadge count={bagCount} />
            </View>
          ),
        }}
      />
    </MainTab.Navigator>
  );
};

// Root Navigator
export const RootNavigator: React.FC = () => {
  const { isLoggedIn, isHydrated, login, logout, setHydrated } = useUserStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Listen for auth state changes from Supabase
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        // Wait for store to be hydrated first
        if (!isHydrated) {
          return;
        }

        // Check for existing session on mount
        const result = await authService.getCurrentUser();
        if (result.success && result.user) {
          login(result.user);
        } else {
          // No valid session, ensure logged out state
          logout();
        }

        // Set up auth state listener only if Supabase is configured
        if (isSupabaseConfigured()) {
          const { data } = authService.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);

            if (event === 'SIGNED_IN' && session?.user) {
              // Fetch user profile and update store
              const profileResult = await authService.getCurrentUser();
              if (profileResult.success && profileResult.user) {
                login(profileResult.user);
              }
            } else if (event === 'SIGNED_OUT') {
              logout();
            } else if (event === 'TOKEN_REFRESHED') {
              // Session refreshed, user is still logged in
              console.log('Token refreshed');
            }
          });
          subscription = data.subscription;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initializeAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isHydrated, login, logout]);

  // Show loading indicator while checking auth state
  if (!isHydrated || isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="shopping-bag" size={64} color={colors.primary} />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        // Auth screens - shown when not logged in
        <>
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              animation: 'fade',
            }}
          />
          <RootStack.Screen
            name="Signup"
            component={SignupScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : (
        // Main app screens - shown when logged in
        <>
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen
            name="ProductDetails"
            component={ProductDetailsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <RootStack.Screen
            name="Search"
            component={SearchScreen}
            options={{
              animation: 'fade',
            }}
          />
          <RootStack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <RootStack.Screen
            name="OrderSuccess"
            component={OrderSuccessScreen}
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <RootStack.Screen
            name="ProfileStack"
            component={ProfileStackNavigator}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <RootStack.Screen
            name="AddAddress"
            component={AddAddressScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
});
