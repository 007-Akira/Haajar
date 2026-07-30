import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import type { TextStyle } from "react-native";

export const fontFamilies = {
  displaySemiBold: "BricolageGrotesque_600SemiBold",
  displayBold: "BricolageGrotesque_700Bold",
  displayExtraBold: "BricolageGrotesque_800ExtraBold",
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export const fontAssets = {
  [fontFamilies.displaySemiBold]: BricolageGrotesque_600SemiBold,
  [fontFamilies.displayBold]: BricolageGrotesque_700Bold,
  [fontFamilies.displayExtraBold]: BricolageGrotesque_800ExtraBold,
  [fontFamilies.bodyRegular]: PlusJakartaSans_400Regular,
  [fontFamilies.bodyMedium]: PlusJakartaSans_500Medium,
  [fontFamilies.bodySemiBold]: PlusJakartaSans_600SemiBold,
  [fontFamilies.monoMedium]: JetBrainsMono_500Medium,
  [fontFamilies.monoBold]: JetBrainsMono_700Bold,
} as const;

export const typography = {
  displayLarge: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  displayMedium: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headingLarge: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 32,
  },
  headingMedium: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 22,
    lineHeight: 28,
  },
  headingSmall: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMalayalam: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 16,
    lineHeight: 29,
  },
  bodyMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  technicalLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  badge: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.55,
  },
  button: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
