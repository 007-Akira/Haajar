import type { ViewStyle } from "react-native";

import { palette } from "./colors";

type ShadowTokens = {
  none: ViewStyle;
  hardSmall: ViewStyle;
  hardMedium: ViewStyle;
};

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  hardSmall: {
    shadowColor: palette.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  hardMedium: {
    shadowColor: palette.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
} satisfies ShadowTokens;

export type ShadowToken = keyof typeof shadows;
