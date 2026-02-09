// Spacing scale (4px base unit)
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// Icon sizes
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  huge: 48,
} as const;

// Common dimensions
export const dimensions = {
  headerHeight: 56,
  tabBarHeight: 60,
  productCardWidth: 160,
  productCardHeight: 280,
  bannerHeight: 180,
  categoryCardSize: 80,
  buttonHeight: 48,
  inputHeight: 48,
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 64,
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
