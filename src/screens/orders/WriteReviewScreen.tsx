import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    StatusBar,
    Platform,
    Keyboard,
    findNodeHandle,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
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

// Upload image to Supabase Storage
const uploadReviewImage = async (
    uri: string,
    fileName: string,
    type: string
): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;

    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const fileExt = fileName.split('.').pop() || 'jpg';
        const filePath = `review-images/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await getSupabase()
            .storage
            .from('reviews')
            .upload(filePath, blob, {
                contentType: type || 'image/jpeg',
                upsert: false,
            });

        if (error) {
            console.error('Upload error:', error);
            // If bucket doesn't exist, try using the product-images bucket
            const { data: data2, error: error2 } = await getSupabase()
                .storage
                .from('product-images')
                .upload(filePath, blob, {
                    contentType: type || 'image/jpeg',
                    upsert: false,
                });

            if (error2) {
                console.error('Fallback upload error:', error2);
                return null;
            }

            const { data: urlData } = getSupabase()
                .storage
                .from('product-images')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        }

        const { data: urlData } = getSupabase()
            .storage
            .from('reviews')
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    } catch (err) {
        console.error('Image upload failed:', err);
        return null;
    }
};

export const WriteReviewScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<WriteReviewRouteProp>();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    const { productId, orderId, productName, imageUrl, existingReview } = route.params;

    // Form state
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [title, setTitle] = useState(existingReview?.title || '');
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [images, setImages] = useState<string[]>(existingReview?.images || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const isEditing = !!existingReview;

    // Scroll to a specific input when it's focused (so keyboard doesn't hide it)
    const scrollToInput = (reactNode: any) => {
        if (scrollViewRef.current && reactNode) {
            // Small delay to wait for keyboard to appear
            setTimeout(() => {
                reactNode.measureLayout(
                    findNodeHandle(scrollViewRef.current) as number,
                    (_x: number, y: number) => {
                        scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                    },
                    () => { } // error callback
                );
            }, 300);
        }
    };

    // Show photo source picker (Camera or Gallery)
    const handleAddPhoto = () => {
        if (images.length >= 5) {
            Alert.alert('Limit Reached', 'You can add up to 5 photos per review.');
            return;
        }

        Alert.alert(
            'Add Photo',
            'Choose a source',
            [
                {
                    text: 'Camera',
                    onPress: () => openCamera(),
                },
                {
                    text: 'Photo Library',
                    onPress: () => openGallery(),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    // Open camera
    const openCamera = async () => {
        try {
            const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1200,
                maxHeight: 1200,
                saveToPhotos: false,
            });

            if (result.didCancel || !result.assets || result.assets.length === 0) {
                return;
            }

            await processPickedImages(result.assets);
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to open camera. Please check camera permissions.');
        }
    };

    // Open gallery
    const openGallery = async () => {
        try {
            const maxToSelect = 5 - images.length;
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1200,
                maxHeight: 1200,
                selectionLimit: maxToSelect,
            });

            if (result.didCancel || !result.assets || result.assets.length === 0) {
                return;
            }

            await processPickedImages(result.assets);
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to open photo library. Please check permissions.');
        }
    };

    // Process and upload picked images
    const processPickedImages = async (assets: Asset[]) => {
        setIsUploading(true);

        try {
            const newImageUrls: string[] = [];

            for (const asset of assets) {
                if (!asset.uri) continue;

                // Try to upload to Supabase Storage
                const uploadedUrl = await uploadReviewImage(
                    asset.uri,
                    asset.fileName || `review_${Date.now()}.jpg`,
                    asset.type || 'image/jpeg'
                );

                if (uploadedUrl) {
                    newImageUrls.push(uploadedUrl);
                } else {
                    // If upload fails, use the local URI as a fallback
                    newImageUrls.push(asset.uri);
                }
            }

            if (newImageUrls.length > 0) {
                setImages(prev => [...prev, ...newImageUrls].slice(0, 5));
            }
        } catch (error) {
            console.error('Image processing error:', error);
            Alert.alert('Upload Error', 'Some images could not be uploaded. Please try again.');
        } finally {
            setIsUploading(false);
        }
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
                Alert.alert('Submission Error', result.error || 'Failed to submit review. Please try again.');
            }
        } catch (error) {
            console.error('Submit review error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            Alert.alert('Submission Error', errorMessage);
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

            <KeyboardAwareScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                enableAutomaticScroll={true}
                extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
                extraHeight={120}
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

                {/* Add Photos Section - NOW ON TOP */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>
                        Add Photos <Text style={styles.optional}>(Optional)</Text>
                    </Text>
                    <Text style={styles.photoHint}>
                        Add up to 5 photos to help other shoppers
                    </Text>

                    {/* Photo Grid */}
                    <View style={styles.photoGrid}>
                        {/* Existing image previews */}
                        {images.map((uri, index) => (
                            <View key={index} style={styles.photoTile}>
                                <Image source={{ uri }} style={styles.photoImage} />
                                <TouchableOpacity
                                    style={styles.removePhotoButton}
                                    onPress={() => handleRemoveImage(index)}
                                >
                                    <Icon name="close" size={14} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Add Photo Button */}
                        {images.length < 5 && (
                            <TouchableOpacity
                                style={styles.addPhotoTile}
                                onPress={handleAddPhoto}
                                disabled={isUploading}
                                activeOpacity={0.7}
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <>
                                        <Icon name="add-a-photo" size={28} color={colors.primary} />
                                        <Text style={styles.addPhotoText}>Add Photo</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {images.length > 0 && (
                        <Text style={styles.photoCount}>
                            {images.length}/5 photos added
                        </Text>
                    )}
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
                {/* Submit Button */}
                <View style={[styles.submitContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (rating === 0 || isSubmitting || isUploading) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={rating === 0 || isSubmitting || isUploading}
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
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },

    contentContainer: {
        flexGrow: 1,
        paddingBottom: spacing.huge,
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

    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },

    photoTile: {
        width: 90,
        height: 90,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        position: 'relative',
    },

    photoImage: {
        width: '100%',
        height: '100%',
        borderRadius: borderRadius.md,
        backgroundColor: colors.skeleton,
    },

    removePhotoButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    addPhotoTile: {
        width: 90,
        height: 90,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3E8FF',
    },

    addPhotoText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 4,
        fontSize: 11,
    },

    photoCount: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },

    bottomSpacer: {
        height: spacing.xs,
    },

    submitContainer: {
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
