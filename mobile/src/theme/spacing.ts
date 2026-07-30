export const spacing = {
  none: 0,
  half: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const layout = {
  screenPadding: spacing.lg,
  wideScreenPadding: spacing.xl,
  gridSize: spacing.xl,
  gridLineWidth: 1,
  minimumTouchTarget: spacing["4xl"],
  primaryActionHeight: 56,
  iconButtonSize: spacing["4xl"],
  inputHeight: 56,
  badgeMinHeight: 24,
  borderWidth: 1,
  focusedBorderWidth: 2,
  gridLineCount: 40,
  skeletonLineHeight: 16,
  skeletonTitleHeight: 24,
  skeletonDefaultLines: 3,
  skeletonTitleWidth: "60%",
  fullWidth: "100%",
} as const;

export const opacity = {
  disabled: 0.45,
  pressed: 0.82,
  subtle: 0.12,
  skeleton: 0.55,
} as const;

export type SpacingToken = keyof typeof spacing;
