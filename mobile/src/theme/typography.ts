import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import type { TextStyle } from "react-native";

export const fontFamilies = {
  displaySemiBold: "Anton_400Regular",
  displayBold: "Anton_400Regular",
  displayExtraBold: "Anton_400Regular",
  bodyRegular: "HankenGrotesk_400Regular",
  bodyMedium: "HankenGrotesk_500Medium",
  bodySemiBold: "HankenGrotesk_700Bold",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export const fontAssets = {
  [fontFamilies.displaySemiBold]: Anton_400Regular,
  [fontFamilies.bodyRegular]: HankenGrotesk_400Regular,
  [fontFamilies.bodyMedium]: HankenGrotesk_500Medium,
  [fontFamilies.bodySemiBold]: HankenGrotesk_700Bold,
  [fontFamilies.monoMedium]: JetBrainsMono_500Medium,
  [fontFamilies.monoBold]: JetBrainsMono_700Bold,
} as const;

export const typography = {
  displayLarge: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -0.7,
    textTransform: "uppercase",
  },
  displayMedium: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -0.3,
    textTransform: "uppercase",
  },
  headingLarge: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  headingMedium: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  headingSmall: { fontFamily: fontFamilies.bodySemiBold, fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: fontFamilies.bodyRegular, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fontFamilies.bodyRegular, fontSize: 16, lineHeight: 24 },
  bodyMalayalam: { fontFamily: fontFamilies.bodyRegular, fontSize: 16, lineHeight: 29 },
  bodyMedium: { fontFamily: fontFamilies.bodyMedium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamilies.bodyRegular, fontSize: 13, lineHeight: 18 },
  technicalLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
  },
  badge: { fontFamily: fontFamilies.monoBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8 },
  button: { fontFamily: fontFamilies.monoBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.8 },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
