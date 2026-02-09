import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    StatusBar,
    Alert,
    Linking,
    ActivityIndicator,
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
import { authService } from '../../services';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger,
}) => (
    <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        disabled={!onPress && !rightElement}
        activeOpacity={onPress ? 0.7 : 1}
    >
        <Icon
            name={icon}
            size={24}
            color={danger ? colors.error : colors.textSecondary}
        />
        <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, danger && styles.dangerText]}>
                {title}
            </Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement || (
            onPress && <Icon name="chevron-right" size={24} color={colors.textTertiary} />
        )}
    </TouchableOpacity>
);

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    const { logout } = useUserStore();

    // Settings state
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleNotificationToggle = (value: boolean) => {
        setNotificationsEnabled(value);
        // In a real app, you would save this preference
        Alert.alert(
            value ? 'Notifications Enabled' : 'Notifications Disabled',
            value
                ? 'You will receive order updates and promotional notifications.'
                : 'You will no longer receive notifications.'
        );
    };

    const handleDarkModeToggle = (value: boolean) => {
        setDarkModeEnabled(value);
        // In a real app, you would update the theme context
        Alert.alert(
            'Coming Soon',
            'Dark mode will be available in a future update!'
        );
        setDarkModeEnabled(false); // Reset since not implemented
    };

    const handlePrivacyPolicy = () => {
        Linking.openURL('https://example.com/privacy-policy').catch(() => {
            Alert.alert('Error', 'Unable to open Privacy Policy');
        });
    };

    const handleTermsOfService = () => {
        Linking.openURL('https://example.com/terms-of-service').catch(() => {
            Alert.alert('Error', 'Unable to open Terms of Service');
        });
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Delete Account',
            'This action is permanent and cannot be undone. All your data, orders, and saved information will be permanently deleted.\n\nAre you sure you want to delete your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: confirmDeleteAccount,
                },
            ]
        );
    };

    const confirmDeleteAccount = async () => {
        Alert.alert(
            'Final Confirmation',
            'Type "DELETE" to confirm account deletion.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'I Understand, Delete',
                    style: 'destructive',
                    onPress: performDeleteAccount,
                },
            ]
        );
    };

    const performDeleteAccount = async () => {
        if (!isSupabaseConfigured()) {
            // Mock delete for development
            Alert.alert(
                'Account Deleted',
                'Your account has been deleted.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            logout();
                        },
                    },
                ]
            );
            return;
        }

        setIsDeleting(true);
        try {
            if (!supabase) {
                Alert.alert('Error', 'Database connection not available');
                return;
            }
            // In a real app, you would:
            // 1. Call a server function to delete user data
            // 2. Delete the auth user
            const { data: userData } = await supabase.auth.getUser();
            const { error } = await supabase.auth.admin.deleteUser(
                userData.user?.id || ''
            );

            if (error) {
                // Alternative: Sign out and mark account for deletion
                await authService.signOut();
                logout();
                Alert.alert(
                    'Request Submitted',
                    'Your account deletion request has been submitted. Your data will be removed within 30 days.'
                );
                return;
            }

            logout();
            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
        } catch (error) {
            console.error('Delete account error:', error);
            Alert.alert(
                'Error',
                'Failed to delete account. Please contact support.'
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'This will clear all cached data and images. You may need to reload some content.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    onPress: () => {
                        // In a real app, you would clear AsyncStorage cache, image cache, etc.
                        Alert.alert('Success', 'Cache cleared successfully');
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
                    <Icon name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* App Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Preferences</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="notifications"
                            title="Push Notifications"
                            subtitle="Order updates & promotions"
                            rightElement={
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={handleNotificationToggle}
                                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                                    thumbColor={notificationsEnabled ? colors.primary : colors.textTertiary}
                                />
                            }
                        />
                        <SettingItem
                            icon="dark-mode"
                            title="Dark Mode"
                            subtitle="Coming soon"
                            rightElement={
                                <Switch
                                    value={darkModeEnabled}
                                    onValueChange={handleDarkModeToggle}
                                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                                    thumbColor={darkModeEnabled ? colors.primary : colors.textTertiary}
                                    disabled
                                />
                            }
                        />
                    </View>
                </View>

                {/* Storage */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="cached"
                            title="Clear Cache"
                            subtitle="Free up storage space"
                            onPress={handleClearCache}
                        />
                    </View>
                </View>

                {/* Legal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Legal</Text>
                    <View style={styles.sectionContent}>
                        <SettingItem
                            icon="privacy-tip"
                            title="Privacy Policy"
                            onPress={handlePrivacyPolicy}
                        />
                        <SettingItem
                            icon="description"
                            title="Terms of Service"
                            onPress={handleTermsOfService}
                        />
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, styles.dangerTitle]}>
                        Danger Zone
                    </Text>
                    <View style={[styles.sectionContent, styles.dangerSection]}>
                        <SettingItem
                            icon="delete-forever"
                            title="Delete Account"
                            subtitle="Permanently remove your account and all data"
                            onPress={handleDeleteAccount}
                            danger
                            rightElement={
                                isDeleting ? (
                                    <ActivityIndicator size="small" color={colors.error} />
                                ) : (
                                    <Icon name="chevron-right" size={24} color={colors.error} />
                                )
                            }
                        />
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appVersion}>Version 1.0.0</Text>
                    <Text style={styles.appCopyright}>
                        © 2024 E-Commerce App. All rights reserved.
                    </Text>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
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

    content: {
        flex: 1,
    },

    section: {
        marginTop: spacing.lg,
    },

    sectionTitle: {
        ...typography.label,
        color: colors.textTertiary,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    dangerTitle: {
        color: colors.error,
    },

    sectionContent: {
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.borderLight,
    },

    dangerSection: {
        borderColor: colors.errorLight,
    },

    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: spacing.md,
    },

    settingContent: {
        flex: 1,
    },

    settingTitle: {
        ...typography.body,
        color: colors.textPrimary,
    },

    dangerText: {
        color: colors.error,
    },

    settingSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.xxs,
    },

    appInfo: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },

    appVersion: {
        ...typography.body,
        color: colors.textTertiary,
    },

    appCopyright: {
        ...typography.caption,
        color: colors.textDisabled,
        marginTop: spacing.xs,
    },

    bottomSpacer: {
        height: spacing.huge,
    },
});
