import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    StatusBar,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ProfileStackParamList } from '../../types';
import { useUserStore } from '../../store';
import { supabase, isSupabaseConfigured } from '../../config/supabase';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

export const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    const { user, login } = useUserStore();

    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImage || '');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone(user.phone || '');
            setProfileImageUrl(user.profileImage || '');
        }
    }, [user]);

    const validateForm = (): boolean => {
        const newErrors: { name?: string; phone?: string } = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (phone && !/^[0-9]{10}$/.test(phone.replace(/\D/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        if (!isSupabaseConfigured()) {
            // Mock update for development
            login({
                ...user!,
                name: name.trim(),
                phone: phone.trim(),
                profileImage: profileImageUrl.trim() || undefined,
            });
            Alert.alert('Success', 'Profile updated successfully!');
            navigation.goBack();
            return;
        }

        setIsLoading(true);
        try {
            if (!supabase) {
                Alert.alert('Error', 'Database connection not available');
                return;
            }
            const { data: authUser } = await supabase.auth.getUser();
            if (!authUser?.user?.id) {
                Alert.alert('Error', 'Please log in again');
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    name: name.trim(),
                    phone: phone.trim() || null,
                    profile_image_url: profileImageUrl.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', authUser.user.id);

            if (error) {
                console.error('Profile update error:', error);
                Alert.alert('Error', error.message || 'Failed to update profile');
                return;
            }

            // Update local store
            login({
                ...user!,
                name: name.trim(),
                phone: phone.trim(),
                profileImage: profileImageUrl.trim() || undefined,
            });

            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Profile update error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarPress = () => {
        Alert.alert(
            'Change Avatar',
            'Enter a URL for your profile picture',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Enter URL',
                    onPress: () => {
                        // In a real app, you'd use an image picker
                        // For now, we'll use the URL input field
                        Alert.prompt?.(
                            'Profile Image URL',
                            'Paste the URL of your profile image',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Save',
                                    onPress: (url?: string) => {
                                        if (url) setProfileImageUrl(url);
                                    },
                                },
                            ],
                            'plain-text',
                            profileImageUrl
                        );
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
            <View style={[styles.safeArea, { paddingTop: insets.top }]} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={handleAvatarPress}
                        >
                            {profileImageUrl ? (
                                <Image
                                    source={{ uri: profileImageUrl }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {name ? name.charAt(0).toUpperCase() : '?'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.avatarEditBadge}>
                                <Icon name="camera-alt" size={16} color={colors.white} />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Tap to change photo</Text>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.form}>
                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    errors.name && styles.inputError,
                                ]}
                            >
                                <Icon
                                    name="person"
                                    size={20}
                                    color={errors.name ? colors.error : colors.textTertiary}
                                />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={(text) => {
                                        setName(text);
                                        if (errors.name) setErrors({ ...errors, name: undefined });
                                    }}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={colors.textDisabled}
                                    autoCapitalize="words"
                                />
                            </View>
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name}</Text>
                            )}
                        </View>

                        {/* Email (Read-only) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={[styles.inputContainer, styles.inputDisabled]}>
                                <Icon name="email" size={20} color={colors.textDisabled} />
                                <TextInput
                                    style={[styles.input, styles.inputTextDisabled]}
                                    value={user?.email || ''}
                                    editable={false}
                                    placeholderTextColor={colors.textDisabled}
                                />
                                <Icon name="lock" size={16} color={colors.textDisabled} />
                            </View>
                            <Text style={styles.helperText}>
                                Email cannot be changed for security reasons
                            </Text>
                        </View>

                        {/* Phone Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    errors.phone && styles.inputError,
                                ]}
                            >
                                <Icon
                                    name="phone"
                                    size={20}
                                    color={errors.phone ? colors.error : colors.textTertiary}
                                />
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={(text) => {
                                        setPhone(text);
                                        if (errors.phone)
                                            setErrors({ ...errors, phone: undefined });
                                    }}
                                    placeholder="Enter your phone number"
                                    placeholderTextColor={colors.textDisabled}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                />
                            </View>
                            {errors.phone && (
                                <Text style={styles.errorText}>{errors.phone}</Text>
                            )}
                        </View>

                        {/* Profile Image URL Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Profile Image URL</Text>
                            <View style={styles.inputContainer}>
                                <Icon name="link" size={20} color={colors.textTertiary} />
                                <TextInput
                                    style={styles.input}
                                    value={profileImageUrl}
                                    onChangeText={setProfileImageUrl}
                                    placeholder="Enter image URL (optional)"
                                    placeholderTextColor={colors.textDisabled}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />
                                {profileImageUrl ? (
                                    <TouchableOpacity onPress={() => setProfileImageUrl('')}>
                                        <Icon name="clear" size={20} color={colors.textTertiary} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },

    flex: {
        flex: 1,
    },

    safeArea: {
        backgroundColor: colors.white,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.white,
    },

    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        ...typography.h5,
        color: colors.textPrimary,
    },

    saveButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        minWidth: 60,
        alignItems: 'center',
    },

    saveButtonDisabled: {
        opacity: 0.5,
    },

    saveButtonText: {
        ...typography.button,
        color: colors.primary,
    },

    content: {
        flex: 1,
    },

    avatarSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.backgroundSecondary,
    },

    avatarContainer: {
        position: 'relative',
    },

    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: colors.white,
    },

    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.white,
    },

    avatarText: {
        ...typography.h2,
        color: colors.white,
    },

    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },

    avatarHint: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },

    form: {
        padding: spacing.lg,
    },

    inputGroup: {
        marginBottom: spacing.lg,
    },

    label: {
        ...typography.label,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 52,
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: spacing.sm,
    },

    inputError: {
        borderColor: colors.error,
        backgroundColor: colors.errorLight,
    },

    inputDisabled: {
        backgroundColor: colors.backgroundTertiary,
        borderColor: colors.borderLight,
    },

    input: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
        paddingVertical: 0,
    },

    inputTextDisabled: {
        color: colors.textDisabled,
    },

    errorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xxs,
    },

    helperText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.xxs,
    },

    bottomSpacer: {
        height: spacing.huge,
    },
});
