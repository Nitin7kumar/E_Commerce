export * from './colors';
export * from './spacing';
export * from './typography';

import { colors } from './colors';
import { spacing, borderRadius, iconSizes, dimensions } from './spacing';
import { typography, fontWeights, fontSizes } from './typography';

export const theme = {
  colors,
  spacing,
  borderRadius,
  iconSizes,
  dimensions,
  typography,
  fontWeights,
  fontSizes,
};

export type Theme = typeof theme;
