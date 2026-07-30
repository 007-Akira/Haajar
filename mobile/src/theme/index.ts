import { colors, palette } from "./colors";
import { radii } from "./radii";
import { shadows } from "./shadows";
import { layout, opacity, spacing } from "./spacing";
import { fontAssets, fontFamilies, typography } from "./typography";

export { colors, palette } from "./colors";
export type { PaletteColor, ThemeColor } from "./colors";
export { radii } from "./radii";
export type { RadiusToken } from "./radii";
export { shadows } from "./shadows";
export type { ShadowToken } from "./shadows";
export { layout, opacity, spacing } from "./spacing";
export type { SpacingToken } from "./spacing";
export { fontAssets, fontFamilies, typography } from "./typography";
export type { TypographyToken } from "./typography";

export const theme = {
  colors,
  palette,
  spacing,
  layout,
  opacity,
  radii,
  shadows,
  typography,
  fontFamilies,
  fontAssets,
} as const;

export type Theme = typeof theme;
