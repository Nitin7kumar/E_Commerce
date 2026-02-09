/**
 * CircularImageCarousel - Infinite scrolling image carousel
 * 
 * CIRCULAR SLIDER LOGIC:
 * 
 * To create an infinite loop effect, we use a technique called "virtual nodes":
 * 
 * 1. Clone the LAST image and prepend it to the beginning
 * 2. Clone the FIRST image and append it to the end
 * 
 * For images [A, B, C], the internal data becomes:
 *   [C, A, B, C, A]
 *    ↑           ↑
 *   Clone      Clone
 *    of C       of A
 * 
 * 3. Start the carousel at index 1 (which shows image A)
 * 
 * 4. When user swipes past the last real image (index 3 = C),
 *    they land on the cloned A (index 4). We then silently
 *    reset to the real A (index 1) without animation.
 * 
 * 5. When user swipes before the first real image (index 0 = cloned C),
 *    we silently reset to the real C (index 3) without animation.
 * 
 * This creates a seamless infinite loop experience.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    View,
    Image,
    FlatList,
    StyleSheet,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ViewToken,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CircularImageCarouselProps {
    images: string[];
    height?: number;
    showIndicators?: boolean;
    autoPlay?: boolean;
    autoPlayInterval?: number;
}

export const CircularImageCarousel: React.FC<CircularImageCarouselProps> = ({
    images,
    height = SCREEN_WIDTH * 1.2,
    showIndicators = true,
    autoPlay = false,
    autoPlayInterval = 3000,
}) => {
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const isScrollingRef = useRef(false);
    const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle single image or empty case
    if (!images || images.length === 0) {
        return (
            <View style={[styles.container, { height }]}>
                <View style={[styles.image, styles.placeholder]}>
                    {/* Placeholder for no image */}
                </View>
            </View>
        );
    }

    // For single image, no need for looping
    if (images.length === 1) {
        return (
            <View style={[styles.container, { height }]}>
                <Image source={{ uri: images[0] }} style={styles.image} />
            </View>
        );
    }

    // Create extended array with cloned edges for circular effect
    // [lastImage, ...originalImages, firstImage]
    const extendedImages = [
        images[images.length - 1], // Clone of last image at start
        ...images,
        images[0], // Clone of first image at end
    ];

    // The initial scroll position (index 1 = first real image)
    const initialIndex = 1;

    // Handle scroll end - check if we need to loop
    const handleScrollEnd = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (isScrollingRef.current) return;

            const offsetX = event.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / SCREEN_WIDTH);

            // Check if we're on a cloned item and need to jump
            if (index === 0) {
                // Scrolled to cloned last item - jump to real last item
                isScrollingRef.current = true;
                flatListRef.current?.scrollToIndex({
                    index: images.length, // Real last image index
                    animated: false,
                });
                setCurrentIndex(images.length - 1);
                setTimeout(() => {
                    isScrollingRef.current = false;
                }, 50);
            } else if (index === extendedImages.length - 1) {
                // Scrolled to cloned first item - jump to real first item
                isScrollingRef.current = true;
                flatListRef.current?.scrollToIndex({
                    index: 1, // Real first image index
                    animated: false,
                });
                setCurrentIndex(0);
                setTimeout(() => {
                    isScrollingRef.current = false;
                }, 50);
            } else {
                // Normal scroll - update indicator
                setCurrentIndex(index - 1); // Subtract 1 because of prepended clone
            }
        },
        [images.length, extendedImages.length]
    );

    // Handle viewable items change for indicator updates during scroll
    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && !isScrollingRef.current) {
                const visibleIndex = viewableItems[0].index ?? 0;
                // Only update if it's a real image (not cloned)
                if (visibleIndex > 0 && visibleIndex < extendedImages.length - 1) {
                    setCurrentIndex(visibleIndex - 1);
                }
            }
        },
        [extendedImages.length]
    );

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    // Auto-play functionality
    useEffect(() => {
        if (autoPlay && images.length > 1) {
            autoPlayTimerRef.current = setInterval(() => {
                const nextIndex = ((currentIndex + 1) % images.length) + 1;
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
            }, autoPlayInterval);

            return () => {
                if (autoPlayTimerRef.current) {
                    clearInterval(autoPlayTimerRef.current);
                }
            };
        }
    }, [autoPlay, autoPlayInterval, currentIndex, images.length]);

    // Scroll to initial position on mount
    useEffect(() => {
        // Small delay to ensure FlatList is ready
        const timer = setTimeout(() => {
            flatListRef.current?.scrollToIndex({
                index: initialIndex,
                animated: false,
            });
        }, 10);

        return () => clearTimeout(timer);
    }, []);

    const renderItem = ({ item }: { item: string }) => (
        <Image
            source={{ uri: item }}
            style={[styles.image, { width: SCREEN_WIDTH, height }]}
            resizeMode="cover"
        />
    );

    const getItemLayout = (_: unknown, index: number) => ({
        length: SCREEN_WIDTH,
        offset: SCREEN_WIDTH * index,
        index,
    });

    return (
        <View style={[styles.container, { height }]}>
            <FlatList
                ref={flatListRef}
                data={extendedImages}
                renderItem={renderItem}
                keyExtractor={(_, index) => `image-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScrollEnd}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={getItemLayout}
                initialScrollIndex={initialIndex}
                bounces={false}
                scrollEventThrottle={16}
            />

            {/* Pagination Indicators */}
            {showIndicators && images.length > 1 && (
                <View style={styles.indicators}>
                    {images.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                currentIndex === index && styles.indicatorActive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: '#f5f5f5',
    },
    image: {
        width: SCREEN_WIDTH,
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicators: {
        position: 'absolute',
        bottom: spacing.md,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.white,
        opacity: 0.5,
    },
    indicatorActive: {
        opacity: 1,
        backgroundColor: colors.primary,
    },
});

export default CircularImageCarousel;
