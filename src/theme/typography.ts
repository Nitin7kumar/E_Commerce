import { TextStyle, Platform } from 'react-native';

// Font family (system fonts for now, can add custom later)
const fontFamily = Platform.select({
  android: 'Roboto',
  ios: 'System',
  default: 'System',
});

// Font weights
export const fontWeights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

// Font sizes
export const fontSizes = {
  xxs: 10,
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  huge: 28,
  massive: 32,
};

// Line heights
export const lineHeights = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
};

// Pre-defined text styles
export const typography = {
  // Headings
  h1: {
    fontFamily,
    fontSize: fontSizes.massive,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.massive * lineHeights.tight,
  } as TextStyle,

  h2: {
    fontFamily,
    fontSize: fontSizes.huge,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.huge * lineHeights.tight,
  } as TextStyle,

  h3: {
    fontFamily,
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.xxxl * lineHeights.tight,
  } as TextStyle,

  h4: {
    fontFamily,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.xxl * lineHeights.normal,
  } as TextStyle,

  h5: {
    fontFamily,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.xl * lineHeights.normal,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontFamily,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.lg * lineHeights.relaxed,
  } as TextStyle,

  body: {
    fontFamily,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.relaxed,
  } as TextStyle,

  // Labels
  label: {
    fontFamily,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * lineHeights.normal,
  } as TextStyle,

  labelSmall: {
    fontFamily,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.xs * lineHeights.normal,
  } as TextStyle,

  // Captions
  caption: {
    fontFamily,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.xs * lineHeights.normal,
  } as TextStyle,

  // Button text
  button: {
    fontFamily,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.md * lineHeights.normal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  buttonSmall: {
    fontFamily,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.sm * lineHeights.normal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  // Price
  price: {
    fontFamily,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.lg * lineHeights.normal,
  } as TextStyle,

  priceSmall: {
    fontFamily,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,

  // Brand name
  brand: {
    fontFamily,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,

  // Product name
  productName: {
    fontFamily,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.normal,
  } as TextStyle,
};

export type TypographyKey = keyof typeof typography;
