/**
 * ReturnModal Component
 * 
 * A modal for submitting return/refund requests for delivered orders.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';
import { getSupabase, isSupabaseConfigured } from '../../config/supabase';

interface ReturnModalProps {
    visible: boolean;
    orderId: string;
    orderItemId?: string;
    productName?: string;
    initialReturnType?: 'refund' | 'replacement' | 'exchange';
    onClose: () => void;
    onSubmit?: () => void;
}

const RETURN_REASONS = [
    { id: 'damaged', label: 'Damaged Product', icon: 'broken-image' },
    { id: 'defective', label: 'Defective/Not Working', icon: 'report-problem' },
    { id: 'wrong_item', label: 'Wrong Item Delivered', icon: 'swap-horiz' },
    { id: 'size_issue', label: 'Size/Fit Issue', icon: 'straighten' },
    { id: 'quality_issue', label: 'Quality Not as Expected', icon: 'thumb-down' },
    { id: 'not_as_described', label: 'Product Not as Described', icon: 'description' },
    { id: 'change_of_mind', label: 'Changed My Mind', icon: 'mood' },
    { id: 'other', label: 'Other', icon: 'more-horiz' },
];

const RETURN_TYPES = [
    { id: 'refund', label: 'Refund', description: 'Get your money back' },
    { id: 'replacement', label: 'Replacement', description: 'Get a new product' },
    { id: 'exchange', label: 'Exchange', description: 'Exchange for different variant' },
];

export const ReturnModal: React.FC<ReturnModalProps> = ({
    visible,
    orderId,
    orderItemId,
    productName,
    initialReturnType,
    onClose,
    onSubmit,
}) => {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [returnType, setReturnType] = useState(initialReturnType || 'refund');

    // Update return type when modal opens or initialReturnType changes
    React.useEffect(() => {
        if (visible) {
            setReturnType(initialReturnType || 'refund');
        }
    }, [visible, initialReturnType]);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedReason) {
            setError('Please select a reason for return');
            return;
        }

        if (!isSupabaseConfigured()) {
            setError('Service temporarily unavailable');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Please login to continue');
                setIsSubmitting(false);
                return;
            }

            // Insert return request
            const { error: insertError } = await supabase
                .from('returns')
                .insert({
                    order_id: orderId,
                    user_id: user.id,
                    order_item_id: orderItemId || null,
                    return_type: returnType,
                    reason: RETURN_REASONS.find(r => r.id === selectedReason)?.label || selectedReason,
                    reason_category: selectedReason,
                    detailed_description: description.trim() || null,
                    status: 'requested',
                });

            if (insertError) {
                setError(insertError.message);
                setIsSubmitting(false);
                return;
            }

            setIsSubmitting(false);
            onSubmit?.();
            onClose();

            // Reset form
            setSelectedReason(null);
            setReturnType('refund');
            setDescription('');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason(null);
        setReturnType('refund');
        setDescription('');
        setError(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Return Item</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                    <Icon name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {productName && (
                                <Text style={styles.productName} numberOfLines={2}>
                                    {productName}
                                </Text>
                            )}

                            {/* Return Type Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>What would you like?</Text>
                                <View style={styles.returnTypeContainer}>
                                    {RETURN_TYPES.map(type => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={[
                                                styles.returnTypeOption,
                                                returnType === type.id && styles.returnTypeSelected,
                                            ]}
                                            onPress={() => setReturnType(type.id)}
                                        >
                                            <View style={styles.radioOuter}>
                                                {returnType === type.id && <View style={styles.radioInner} />}
                                            </View>
                                            <View style={styles.returnTypeText}>
                                                <Text style={styles.returnTypeLabel}>{type.label}</Text>
                                                <Text style={styles.returnTypeDesc}>{type.description}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Reason Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Reason for Return *</Text>
                                <View style={styles.reasonsContainer}>
                                    {RETURN_REASONS.map(reason => (
                                        <TouchableOpacity
                                            key={reason.id}
                                            style={[
                                                styles.reasonOption,
                                                selectedReason === reason.id && styles.reasonSelected,
                                            ]}
                                            onPress={() => setSelectedReason(reason.id)}
                                        >
                                            <Icon
                                                name={reason.icon}
                                                size={20}
                                                color={selectedReason === reason.id ? colors.primary : colors.textSecondary}
                                            />
                                            <Text
                                                style={[
                                                    styles.reasonLabel,
                                                    selectedReason === reason.id && styles.reasonLabelSelected,
                                                ]}
                                            >
                                                {reason.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Description */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
                                <TextInput
                                    style={styles.descriptionInput}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Describe the issue in detail..."
                                    placeholderTextColor={colors.textTertiary}
                                    multiline
                                    numberOfLines={4}
                                    maxLength={500}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.charCount}>{description.length}/500</Text>
                            </View>

                            {/* Error Message */}
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Icon name="error-outline" size={16} color={colors.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Info Note */}
                            <View style={styles.infoNote}>
                                <Icon name="info-outline" size={16} color={colors.info} />
                                <Text style={styles.infoText}>
                                    Return request will be reviewed within 24-48 hours. You'll receive an email with pickup details.
                                </Text>
                            </View>

                            {/* Submit Button */}
                            <View style={styles.buttonContainer}>
                                <Button
                                    title="Submit Return Request"
                                    onPress={handleSubmit}
                                    disabled={isSubmitting || !selectedReason}
                                    loading={isSubmitting}
                                />
                            </View>
                        </ScrollView>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },

    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },

    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        maxHeight: '90%',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: spacing.md,
    },

    headerTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },

    closeButton: {
        padding: spacing.xs,
    },

    productName: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },

    section: {
        marginBottom: spacing.lg,
    },

    sectionTitle: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },

    returnTypeContainer: {
        gap: spacing.sm,
    },

    returnTypeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
    },

    returnTypeSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '10',
    },

    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },

    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },

    returnTypeText: {
        flex: 1,
    },

    returnTypeLabel: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },

    returnTypeDesc: {
        ...typography.caption,
        color: colors.textSecondary,
    },

    reasonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },

    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },

    reasonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '20',
    },

    reasonLabel: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: 13,
    },

    reasonLabelSelected: {
        color: colors.primary,
        fontWeight: '600',
    },

    descriptionInput: {
        ...typography.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 100,
    },

    charCount: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },

    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.errorLight,
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.lg,
    },

    errorText: {
        ...typography.body,
        color: colors.error,
        flex: 1,
    },

    infoNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.infoLight,
        padding: spacing.md,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.lg,
    },

    infoText: {
        ...typography.caption,
        color: colors.info,
        flex: 1,
        lineHeight: 18,
    },

    buttonContainer: {
        marginBottom: spacing.lg,
    },
});
