export const radii = {
  none: 0,
  xs: 4,
  sm: 4,
  md: 4,
  lg: 4,
  pill: 4,
} as const;

export type RadiusToken = keyof typeof radii;
