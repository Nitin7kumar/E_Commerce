import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ProfileStackParamList } from '../../types';
import { supabase, isSupabaseConfigured } from '../../config/supabase';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface Coupon {
    id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_purchase: number;
    max_discount?: number;
    valid_until: string;
    is_active: boolean;
}

// Mock coupons for development
const mockCoupons: Coupon[] = [
    {
        id: '1',
        code: 'WELCOME50',
        description: 'Get 50% off on your first order',
        discount_type: 'percentage',
        discount_value: 50,
        min_purchase: 999,
        max_discount: 500,
        valid_until: '2024-12-31',
        is_active: true,
    },
    {
        id: '2',
        code: 'FLAT200',
        description: 'Flat ₹200 off on orders above ₹1499',
        discount_type: 'fixed',
        discount_value: 200,
        min_purchase: 1499,
        valid_until: '2024-12-31',
        is_active: true,
    },
    {
        id: '3',
        code: 'SUMMER25',
        description: '25% off on summer collection',
        discount_type: 'percentage',
        discount_value: 25,
        min_purchase: 799,
        max_discount: 300,
        valid_until: '2024-06-30',
        is_active: true,
    },
    {
        id: '4',
        code: 'FREESHIP',
        description: 'Free shipping on all orders',
        discount_type: 'fixed',
        discount_value: 99,
        min_purchase: 499,
        valid_until: '2024-12-31',
        is_active: true,
    },
];

const CouponCard: React.FC<{ coupon: Coupon; onCopy: (code: string) => void }> = ({
    coupon,
    onCopy,
}) => {
    const expiryDate = new Date(coupon.valid_until);
    const isExpiringSoon =
        expiryDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

    return (
        <View style={styles.couponCard}>
            <View style={styles.couponLeft}>
                <View style={styles.couponBadge}>
                    <Icon name="local-offer" size={24} color={colors.primary} />
                </View>
            </View>

            <View style={styles.couponCenter}>
                <View style={styles.couponHeader}>
                    <Text style={styles.couponCode}>{coupon.code}</Text>
                    {isExpiringSoon && (
                        <View style={styles.expiringSoonBadge}>
                            <Text style={styles.expiringSoonText}>Expiring Soon</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.couponDescription}>{coupon.description}</Text>

                <View style={styles.couponDetails}>
                    <Text style={styles.couponMinPurchase}>
                        Min. order: ₹{coupon.min_purchase}
                    </Text>
                    {coupon.max_discount && (
                        <Text style={styles.couponMaxDiscount}>
                            • Max discount: ₹{coupon.max_discount}
                        </Text>
                    )}
                </View>

                <Text style={styles.couponExpiry}>
                    Valid until {expiryDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.copyButton}
                onPress={() => onCopy(coupon.code)}
            >
                <Icon name="content-copy" size={20} color={colors.primary} />
                <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
        </View>
    );
};

export const CouponsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();

    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchCoupons = useCallback(async () => {
        if (!isSupabaseConfigured() || !supabase) {
            // Use mock data for development
            setCoupons(mockCoupons);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('is_active', true)
                .gte('valid_until', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch coupons error:', error);
                Alert.alert('Error', 'Failed to load coupons');
                return;
            }

            setCoupons(data || []);
        } catch (error) {
            console.error('Fetch coupons error:', error);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchCoupons();
    };

    const handleCopyCode = (code: string) => {
        // Show alert with the code - user can long-press to copy
        Alert.alert(
            'Coupon Code Copied!',
            `Use code: ${code}\n\nYou can long-press to copy this code.`,
            [{ text: 'OK' }]
        );
    };

    const renderCoupon = ({ item }: { item: Coupon }) => (
        <CouponCard coupon={item} onCopy={handleCopyCode} />
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Icon name="local-offer" size={64} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Coupons Available</Text>
            <Text style={styles.emptySubtitle}>
                Check back later for new offers and discounts!
            </Text>
        </View>
    );

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
                <Text style={styles.headerTitle}>Coupons</Text>
                <View style={styles.backButton} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading coupons...</Text>
                </View>
            ) : (
                <FlatList
                    data={coupons}
                    renderItem={renderCoupon}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
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

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingText: {
        ...typography.body,
        color: colors.textTertiary,
        marginTop: spacing.md,
    },

    listContent: {
        padding: spacing.lg,
        flexGrow: 1,
    },

    separator: {
        height: spacing.md,
    },

    couponCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },

    couponLeft: {
        width: 60,
        backgroundColor: colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: colors.borderLight,
        borderStyle: 'dashed',
    },

    couponBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },

    couponCenter: {
        flex: 1,
        padding: spacing.md,
    },

    couponHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },

    couponCode: {
        ...typography.h5,
        color: colors.primary,
        fontWeight: '700',
        letterSpacing: 1,
    },

    expiringSoonBadge: {
        backgroundColor: colors.warningLight,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.xs,
    },

    expiringSoonText: {
        ...typography.caption,
        color: colors.warning,
        fontSize: 10,
        fontWeight: '600',
    },

    couponDescription: {
        ...typography.body,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    couponDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },

    couponMinPurchase: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    couponMaxDiscount: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    couponExpiry: {
        ...typography.caption,
        color: colors.textTertiary,
    },

    copyButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderLeftWidth: 1,
        borderLeftColor: colors.borderLight,
        gap: spacing.xxs,
    },

    copyButtonText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },

    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },

    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },

    emptyTitle: {
        ...typography.h5,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    emptySubtitle: {
        ...typography.body,
        color: colors.textTertiary,
        textAlign: 'center',
    },
});
