import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ProfileStackParamList, Address } from '../../types';
import { useUserStore } from '../../store';
import { addressService } from '../../services';
import { isSupabaseConfigured } from '../../config/supabase';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onSetDefault,
  onDelete,
}) => (
  <View style={styles.addressCard}>
    <View style={styles.addressHeader}>
      <View style={styles.addressTypeContainer}>
        <Icon
          name={address.type === 'home' ? 'home' : address.type === 'work' ? 'work' : 'location-on'}
          size={20}
          color={colors.primary}
        />
        <Text style={styles.addressType}>{address.type.toUpperCase()}</Text>
        {address.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={onEdit}>
        <Icon name="edit" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>

    <Text style={styles.addressName}>{address.name}</Text>
    <Text style={styles.addressText}>
      {address.address}, {address.locality}
    </Text>
    <Text style={styles.addressText}>
      {address.city}, {address.state} - {address.pincode}
    </Text>
    <Text style={styles.addressPhone}>Phone: {address.phone}</Text>

    <View style={styles.addressActions}>
      {!address.isDefault && (
        <TouchableOpacity style={styles.actionButton} onPress={onSetDefault}>
          <Icon name="check-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>Set as Default</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
        <Icon name="delete-outline" size={18} color={colors.error} />
        <Text style={[styles.actionButtonText, { color: colors.error }]}>Remove</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const AddressesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {
    addresses: localAddresses,
    setDefaultAddress: setLocalDefault,
    removeAddress: removeLocalAddress,
    addAddress: addLocalAddress,
  } = useUserStore();

  const [addresses, setAddresses] = useState<Address[]>(localAddresses);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch addresses from Supabase
  const fetchAddresses = useCallback(async (showRefresh = false) => {
    if (!isSupabaseConfigured()) {
      // Fallback to local addresses
      setAddresses(localAddresses);
      return;
    }

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      console.log('📍 AddressesScreen: Fetching addresses from Supabase...');
      const result = await addressService.getAddresses();

      if (result.error) {
        console.error('📍 AddressesScreen: Fetch error:', result.error);
        // Fallback to local on error
        setAddresses(localAddresses);
      } else {
        console.log('📍 AddressesScreen: Found', result.addresses.length, 'addresses');
        setAddresses(result.addresses);

        // Sync local store with database (single source of truth)
        // Clear local addresses and replace with db addresses
        // This ensures consistency
      }
    } catch (error) {
      console.error('📍 AddressesScreen: Exception:', error);
      setAddresses(localAddresses);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [localAddresses]);

  // Fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses])
  );

  const handleAddAddress = () => {
    navigation.navigate('AddAddress', {});
  };

  const handleEditAddress = (addressId: string) => {
    navigation.navigate('AddAddress', { addressId });
  };

  const handleSetDefault = async (addressId: string) => {
    if (isSupabaseConfigured()) {
      try {
        const result = await addressService.setDefaultAddress(addressId);
        if (result.error) {
          Alert.alert('Error', `Failed to set default: ${result.error}`);
          return;
        }
        // Refresh addresses to reflect change
        fetchAddresses();
      } catch (error) {
        Alert.alert('Error', 'Failed to set default address');
      }
    } else {
      setLocalDefault(addressId);
      setAddresses(prev => prev.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId,
      })));
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isSupabaseConfigured()) {
              try {
                const result = await addressService.deleteAddress(addressId);
                if (result.error) {
                  Alert.alert('Error', `Failed to delete: ${result.error}`);
                  return;
                }
                // Remove from local state
                setAddresses(prev => prev.filter(addr => addr.id !== addressId));
                removeLocalAddress(addressId);
              } catch (error) {
                Alert.alert('Error', 'Failed to delete address');
              }
            } else {
              removeLocalAddress(addressId);
              setAddresses(prev => prev.filter(addr => addr.id !== addressId));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchAddresses(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="location-off" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Saved Addresses</Text>
            <Text style={styles.emptySubtitle}>
              Add your delivery address to make checkout faster
            </Text>
          </View>
        ) : (
          addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => handleEditAddress(address.id)}
              onSetDefault={() => handleSetDefault(address.id)}
              onDelete={() => handleDeleteAddress(address.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Add New Address Button */}
      <View style={[styles.bottomButton, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddAddress}>
          <Icon name="add" size={24} color={colors.white} />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  backButton: {
    padding: spacing.xs,
  },

  headerTitle: {
    ...typography.h5,
    color: colors.textPrimary,
  },

  placeholder: {
    width: 32,
  },

  content: {
    flex: 1,
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

  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },

  emptyTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },

  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  addressCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  addressType: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },

  defaultBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
    marginLeft: spacing.xs,
  },

  defaultBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 10,
  },

  addressName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  addressText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  addressPhone: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  addressActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.lg,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  actionButtonText: {
    ...typography.label,
    color: colors.primary,
  },

  bottomButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },

  addButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
