import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ProfileStackParamList } from '../../types';
import { reviewService } from '../../services/reviewService';
import { getSupabase, isSupabaseConfigured } from '../../config/supabase';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;
type WriteReviewRouteProp = RouteProp<ProfileStackParamList, 'WriteReview'>;

// Star Rating Component
const StarRating: React.FC<{
    rating: number;
    onRatingChange: (rating: number) => void;
    size?: number;
    readonly?: boolean;
}> = ({ rating, onRatingChange, size = 40, readonly = false }) => {
    const stars = [1, 2, 3, 4, 5];

    return (
        <View style={styles.starContainer}>
            {stars.map((star) => (
                <TouchableOpacity
                    key={star}
                    onPress={() => !readonly && onRatingChange(star)}
                    disabled={readonly}
                    activeOpacity={readonly ? 1 : 0.7}
                    style={styles.starButton}
                >
                    <Icon
                        name={star <= rating ? 'star' : 'star-border'}
                        size={size}
                        color={star <= rating ? colors.star : colors.starEmpty}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Rating Labels
const getRatingLabel = (rating: number): string => {
    switch (rating) {
        case 1:
            return 'Poor';
        case 2:
            return 'Fair';
        case 3:
            return 'Good';
        case 4:
            return 'Very Good';
        case 5:
            return 'Excellent';
        default:
            return 'Tap to rate';
    }
};

export const WriteReviewScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<WriteReviewRouteProp>();
    const insets = useSafeAreaInsets();

    const { productId, orderId, productName, imageUrl, existingReview } = route.params;

    // Form state
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [title, setTitle] = useState(existingReview?.title || '');
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [images, setImages] = useState<string[]>(existingReview?.images || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');

    const isEditing = !!existingReview;

    // Add image from URL input
    const handleAddImage = () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can add up to 5 images per review.');
            return;
        }

        const url = imageUrlInput.trim();
        if (!url) {
            Alert.alert('No URL', 'Please enter an image URL.');
            return;
        }

        // Basic URL validation
        if (!url.match(/^https?:\/\/.+/i)) {
            Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
            return;
        }

        setImages([...images, url]);
        setImageUrlInput('');
    };

    // Remove image
    const handleRemoveImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    // Submit review to Supabase
    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please select a star rating.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Use the reviewService to create/update the review
            const result = await reviewService.createReview({
                product_id: productId,
                order_id: orderId,
                rating,
                title: title.trim() || undefined,
                comment: comment.trim() || undefined,
                images: images.length > 0 ? images : undefined,
            });

            if (result.success) {
                Alert.alert(
                    isEditing ? 'Review Updated!' : 'Thank You!',
                    isEditing
                        ? 'Your review has been updated successfully.'
                        : 'Your review has been submitted successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.goBack(),
                        },
                    ]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to submit review. Please try again.');
            }
        } catch (error) {
            console.error('Submit review error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
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
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Review' : 'Write a Review'}
                </Text>
                <View style={styles.backButton} />
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
                    {/* Product Info Header */}
                    <View style={styles.productSection}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.productImage}
                        />
                        <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={2}>
                                {productName}
                            </Text>
                            <Text style={styles.reviewingText}>
                                {isEditing ? 'Editing your review' : 'Share your experience'}
                            </Text>
                        </View>
                    </View>

                    {/* Star Rating Section */}
                    <View style={styles.ratingSection}>
                        <Text style={styles.sectionTitle}>Your Rating</Text>
                        <StarRating rating={rating} onRatingChange={setRating} />
                        <Text style={[
                            styles.ratingLabel,
                            rating > 0 && { color: colors.star }
                        ]}>
                            {getRatingLabel(rating)}
                        </Text>
                    </View>

                    {/* Review Title */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>
                            Review Title <Text style={styles.optional}>(Optional)</Text>
                        </Text>
                        <TextInput
                            style={styles.titleInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Summarize your experience"
                            placeholderTextColor={colors.textDisabled}
                            maxLength={100}
                        />
                        <Text style={styles.charCount}>{title.length}/100</Text>
                    </View>

                    {/* Review Comment */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>
                            Your Review <Text style={styles.optional}>(Optional)</Text>
                        </Text>
                        <TextInput
                            style={styles.commentInput}
                            value={comment}
                            onChangeText={setComment}
                            placeholder="Tell others what you liked or disliked about this product..."
                            placeholderTextColor={colors.textDisabled}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            maxLength={1000}
                        />
                        <Text style={styles.charCount}>{comment.length}/1000</Text>
                    </View>

                    {/* Image Upload Section */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>
                            Add Photos <Text style={styles.optional}>(Optional)</Text>
                        </Text>
                        <Text style={styles.photoHint}>
                            Add up to 5 image URLs to help other shoppers
                        </Text>

                        {/* Image URL Input */}
                        <View style={styles.imageUrlInputContainer}>
                            <TextInput
                                style={styles.imageUrlInput}
                                value={imageUrlInput}
                                onChangeText={setImageUrlInput}
                                placeholder="Paste image URL here..."
                                placeholderTextColor={colors.textDisabled}
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                            <TouchableOpacity
                                style={[
                                    styles.addUrlButton,
                                    (!imageUrlInput.trim() || images.length >= 5) && styles.addUrlButtonDisabled
                                ]}
                                onPress={handleAddImage}
                                disabled={!imageUrlInput.trim() || images.length >= 5}
                            >
                                <Icon name="add" size={24} color={colors.white} />
                            </TouchableOpacity>
                        </View>

                        {/* Image Previews */}
                        {images.length > 0 && (
                            <View style={styles.imagesContainer}>
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.imagePreviewContainer}>
                                        <Image source={{ uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => handleRemoveImage(index)}
                                        >
                                            <Icon name="close" size={16} color={colors.white} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.bottomSpacer} />
                </ScrollView>

                {/* Submit Button */}
                <View style={[styles.submitContainer, { paddingBottom: insets.bottom + spacing.md }]}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (rating === 0 || isSubmitting) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditing ? 'Update Review' : 'Submit Review'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
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

    content: {
        flex: 1,
    },

    productSection: {
        flexDirection: 'row',
        padding: spacing.lg,
        backgroundColor: colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },

    productImage: {
        width: 70,
        height: 90,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.skeleton,
    },

    productInfo: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },

    productName: {
        ...typography.body,
        color: colors.textPrimary,
        fontWeight: '600',
    },

    reviewingText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },

    ratingSection: {
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },

    sectionTitle: {
        ...typography.h5,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },

    starContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },

    starButton: {
        padding: spacing.xs,
    },

    ratingLabel: {
        ...typography.body,
        color: colors.textTertiary,
        marginTop: spacing.md,
        fontWeight: '500',
    },

    inputSection: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },

    inputLabel: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    optional: {
        color: colors.textTertiary,
        fontWeight: 'normal',
    },

    titleInput: {
        ...typography.body,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },

    commentInput: {
        ...typography.body,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.borderLight,
        minHeight: 120,
    },

    charCount: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'right',
        marginTop: spacing.xs,
    },

    photoHint: {
        ...typography.caption,
        color: colors.textTertiary,
        marginBottom: spacing.md,
    },

    imageUrlInputContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },

    imageUrlInput: {
        flex: 1,
        ...typography.body,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },

    addUrlButton: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    addUrlButtonDisabled: {
        backgroundColor: colors.textDisabled,
    },

    imagesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },

    imagePreviewContainer: {
        position: 'relative',
    },

    imagePreview: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.skeleton,
    },

    removeImageButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },

    bottomSpacer: {
        height: 120,
    },

    submitContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        elevation: 8,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },

    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },

    submitButtonDisabled: {
        backgroundColor: colors.textDisabled,
    },

    submitButtonText: {
        ...typography.button,
        color: colors.white,
    },
});
