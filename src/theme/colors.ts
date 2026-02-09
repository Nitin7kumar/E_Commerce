// Myntra-inspired Color Palette

export const colors = {
  // Primary brand colors (Myntra pink/magenta)
  primary: '#FF3F6C',
  primaryDark: '#E91E63',
  primaryLight: '#FF6B8A',

  // Secondary accent
  secondary: '#FF9F1C',
  secondaryLight: '#FFB74D',

  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F6',
  backgroundTertiary: '#FAFAFA',

  // Surface colors
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text colors
  textPrimary: '#282C3F',
  textSecondary: '#535766',
  textTertiary: '#7E818C',
  textDisabled: '#94969F',
  textInverse: '#FFFFFF',
  textLink: '#FF3F6C',

  // Border colors
  border: '#D4D5D9',
  borderLight: '#EAEAEC',
  borderDark: '#B5B6BA',

  // Status colors
  success: '#03A685',
  successLight: '#E8F8F4',
  warning: '#FF9F1C',
  warningLight: '#FFF8E1',
  error: '#FF3F6C',
  errorLight: '#FFEBEE',
  info: '#526CD0',
  infoLight: '#E3F2FD',

  // Rating star
  star: '#FFB100',
  starEmpty: '#D4D5D9',

  // Discount badge
  discountBg: '#FF3F6C',
  discountText: '#FFFFFF',

  // Price colors
  priceOriginal: '#7E818C',
  priceDiscounted: '#FF3F6C',
  priceFinal: '#282C3F',

  // Cart/Bag
  bagBadge: '#FF3F6C',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Skeleton loading
  skeleton: '#E8E8E8',
  skeletonHighlight: '#F5F5F5',

  // Transparent
  transparent: 'transparent',

  // White and Black
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorKey = keyof typeof colors;
