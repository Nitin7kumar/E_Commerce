/**
 * ReviewModal Component
 * 
 * A modal for writing product reviews with star rating input
 * and text area for comments.
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
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';
import { reviewService, CreateReviewData } from '../../services/reviewService';

interface ReviewModalProps {
    visible: boolean;
    productId: string;
    productName?: string;
    orderId?: string;
    existingReview?: {
        rating: number;
        title?: string;
        comment?: string;
    };
    onClose: () => void;
    onSubmit?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
    visible,
    productId,
    productName,
    orderId,
    existingReview,
    onClose,
    onSubmit,
}) => {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [title, setTitle] = useState(existingReview?.title || '');
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const reviewData: CreateReviewData = {
            product_id: productId,
            order_id: orderId,
            rating,
            title: title.trim() || undefined,
            comment: comment.trim() || undefined,
        };

        const result = await reviewService.createReview(reviewData);

        setIsSubmitting(false);

        if (result.success) {
            onSubmit?.();
            onClose();
            // Reset form
            setRating(0);
            setTitle('');
            setComment('');
        } else {
            setError(result.error || 'Failed to submit review');
        }
    };

    const handleClose = () => {
        setRating(existingReview?.rating || 0);
        setTitle(existingReview?.title || '');
        setComment(existingReview?.comment || '');
        setError(null);
        onClose();
    };

    const ratingLabels = ['Terrible', 'Poor', 'Average', 'Good', 'Excellent'];

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
                                <Text style={styles.headerTitle}>Write a Review</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                    <Icon name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {productName && (
                                <Text style={styles.productName} numberOfLines={2}>
                                    {productName}
                                </Text>
                            )}

                            {/* Star Rating */}
                            <View style={styles.ratingSection}>
                                <Text style={styles.sectionLabel}>Your Rating *</Text>
                                <View style={styles.starsContainer}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() => setRating(star)}
                                            style={styles.starButton}
                                        >
                                            <Icon
                                                name={star <= rating ? 'star' : 'star-border'}
                                                size={40}
                                                color={star <= rating ? colors.star : colors.starEmpty}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {rating > 0 && (
                                    <Text style={styles.ratingLabel}>{ratingLabels[rating - 1]}</Text>
                                )}
                            </View>

                            {/* Title Input */}
                            <View style={styles.inputSection}>
                                <Text style={styles.sectionLabel}>Review Title (Optional)</Text>
                                <TextInput
                                    style={styles.titleInput}
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Summarize your experience"
                                    placeholderTextColor={colors.textTertiary}
                                    maxLength={100}
                                />
                                <Text style={styles.charCount}>{title.length}/100</Text>
                            </View>

                            {/* Comment Input */}
                            <View style={styles.inputSection}>
                                <Text style={styles.sectionLabel}>Your Review (Optional)</Text>
                                <TextInput
                                    style={styles.commentInput}
                                    value={comment}
                                    onChangeText={setComment}
                                    placeholder="Share your experience with this product..."
                                    placeholderTextColor={colors.textTertiary}
                                    multiline
                                    numberOfLines={5}
                                    maxLength={1000}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.charCount}>{comment.length}/1000</Text>
                            </View>

                            {/* Error Message */}
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Icon name="error-outline" size={16} color={colors.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Submit Button */}
                            <View style={styles.buttonContainer}>
                                <Button
                                    title={existingReview ? 'Update Review' : 'Submit Review'}
                                    onPress={handleSubmit}
                                    disabled={isSubmitting || rating === 0}
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

    ratingSection: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: spacing.lg,
    },

    sectionLabel: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    starsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },

    starButton: {
        padding: spacing.xs,
    },

    ratingLabel: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
        marginTop: spacing.sm,
    },

    inputSection: {
        marginBottom: spacing.lg,
    },

    titleInput: {
        ...typography.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginTop: spacing.xs,
    },

    commentInput: {
        ...typography.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginTop: spacing.xs,
        minHeight: 120,
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

    buttonContainer: {
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
});
