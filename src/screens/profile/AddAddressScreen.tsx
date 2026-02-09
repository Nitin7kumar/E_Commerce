import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
type AddAddressRouteProp = RouteProp<ProfileStackParamList, 'AddAddress'>;

interface FormData {
  name: string;
  phone: string;
  pincode: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
}

const initialFormData: FormData = {
  name: '',
  phone: '',
  pincode: '',
  address: '',
  locality: '',
  city: '',
  state: '',
  type: 'home',
  isDefault: false,
};

export const AddAddressScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddAddressRouteProp>();
  const insets = useSafeAreaInsets();
  const { addresses, addAddress, updateAddress } = useUserStore();

  const editingAddressId = route.params?.addressId;
  const isEditing = !!editingAddressId;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (editingAddressId) {
      const existingAddress = addresses.find(a => a.id === editingAddressId);
      if (existingAddress) {
        setFormData({
          name: existingAddress.name,
          phone: existingAddress.phone,
          pincode: existingAddress.pincode,
          address: existingAddress.address,
          locality: existingAddress.locality,
          city: existingAddress.city,
          state: existingAddress.state,
          type: existingAddress.type,
          isDefault: existingAddress.isDefault,
        });
      }
    }
  }, [editingAddressId, addresses]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (formData.phone.length !== 10) newErrors.phone = 'Enter valid 10-digit phone';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (formData.pincode.length !== 6) newErrors.pincode = 'Enter valid 6-digit pincode';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.locality.trim()) newErrors.locality = 'Locality is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // State for save operation
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!validateForm()) return;

    const addressData: Omit<Address, 'id'> = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      pincode: formData.pincode.trim(),
      address: formData.address.trim(),
      locality: formData.locality.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      type: formData.type,
      isDefault: formData.isDefault || addresses.length === 0,
    };

    setIsSaving(true);

    try {
      // If Supabase is configured, persist to database
      if (isSupabaseConfigured()) {
        console.log('📍 AddAddressScreen: Saving address to Supabase...');

        if (isEditing) {
          // Update existing address in Supabase
          const result = await addressService.updateAddress(editingAddressId, addressData);

          if (result.error) {
            console.error('📍 AddAddressScreen: Update failed:', result.error);
            Alert.alert('Error', `Failed to update address: ${result.error}`);
            return;
          }

          // Sync to local store
          if (result.address) {
            updateAddress(editingAddressId, result.address);
            console.log('📍 AddAddressScreen: Address updated successfully in Supabase');
          }
        } else {
          // Add new address to Supabase
          const result = await addressService.addAddress(addressData);

          if (result.error) {
            console.error('📍 AddAddressScreen: Insert failed:', result.error);
            Alert.alert('Error', `Failed to save address: ${result.error}`);
            return;
          }

          // Sync to local store
          if (result.address) {
            addAddress(result.address);
            console.log('📍 AddAddressScreen: Address saved successfully to Supabase with ID:', result.address.id);
          }
        }
      } else {
        // Fallback: Local-only storage when Supabase not configured
        console.log('📍 AddAddressScreen: Supabase not configured, using local storage only');
        const localAddress: Address = {
          id: editingAddressId || `addr_${Date.now()}`,
          ...addressData,
        };

        if (isEditing) {
          updateAddress(editingAddressId!, localAddress);
        } else {
          addAddress(localAddress);
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error('📍 AddAddressScreen: Exception:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof FormData,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'numeric' | 'phone-pad';
      maxLength?: number;
      multiline?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          options?.multiline && styles.multilineInput,
          errors[field] && styles.inputError,
        ]}
        value={formData[field] as string}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={options?.keyboardType || 'default'}
        maxLength={options?.maxLength}
        multiline={options?.multiline}
      />
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Address' : 'Add New Address'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
        extraHeight={120}
      >
        {/* Contact Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          {renderInput('Full Name', 'name', 'Enter full name')}
          {renderInput('Phone Number', 'phone', 'Enter 10-digit phone number', {
            keyboardType: 'phone-pad',
            maxLength: 10,
          })}
        </View>

        {/* Address Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          {renderInput('Pincode', 'pincode', 'Enter 6-digit pincode', {
            keyboardType: 'numeric',
            maxLength: 6,
          })}
          {renderInput('Address (House No, Building, Street)', 'address', 'Enter your address', {
            multiline: true,
          })}
          {renderInput('Locality / Area', 'locality', 'Enter locality or area')}
          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              {renderInput('City', 'city', 'City')}
            </View>
            <View style={styles.halfInput}>
              {renderInput('State', 'state', 'State')}
            </View>
          </View>
        </View>

        {/* Address Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Save Address As</Text>
          <View style={styles.typeContainer}>
            {(['home', 'work', 'other'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  formData.type === type && styles.typeButtonActive,
                ]}
                onPress={() => updateField('type', type)}
              >
                <Icon
                  name={type === 'home' ? 'home' : type === 'work' ? 'work' : 'location-on'}
                  size={20}
                  color={formData.type === type ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Default Address Toggle */}
        <TouchableOpacity
          style={styles.defaultToggle}
          onPress={() => updateField('isDefault', !formData.isDefault)}
        >
          <Icon
            name={formData.isDefault ? 'check-box' : 'check-box-outline-blank'}
            size={24}
            color={formData.isDefault ? colors.primary : colors.textSecondary}
          />
          <Text style={styles.defaultToggleText}>Set as default address</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <View style={[styles.saveButtonContainer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update Address' : 'Save Address'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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

  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  inputContainer: {
    marginBottom: spacing.md,
  },

  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  inputError: {
    borderColor: colors.error,
  },

  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },

  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  halfInput: {
    flex: 1,
  },

  typeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },

  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },

  typeButtonText: {
    ...typography.label,
    color: colors.textSecondary,
  },

  typeButtonTextActive: {
    color: colors.primary,
  },

  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },

  defaultToggleText: {
    ...typography.body,
    color: colors.textPrimary,
  },

  saveButtonContainer: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
  },

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
