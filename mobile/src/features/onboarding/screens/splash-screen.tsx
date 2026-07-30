import { useEffect } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components";
import { APP_NAME, APP_NAME_MALAYALAM, APP_TAGLINE, SPLASH_TRANSITION_MS } from "@/constants/app";
import { colors, spacing, typography } from "@/theme";

export function SplashScreen(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const transition = setTimeout(() => {
      router.replace("/sign-in");
    }, SPLASH_TRANSITION_MS);

    return () => clearTimeout(transition);
  }, [router]);

  return (
    <ScreenContainer contentContainerStyle={styles.content} showGrid testID="splash-screen">
      <View accessibilityLabel="Haajar" accessibilityRole="header" style={styles.brand}>
        <Text style={styles.wordmark}>{APP_NAME}</Text>
        <Text style={styles.malayalam}>{APP_NAME_MALAYALAM}</Text>
      </View>
      <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.loading} testID="splash-loading-label">
        [ INITIALISING ]
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  brand: {
    alignItems: "center",
    gap: spacing.xs,
  },
  wordmark: {
    ...typography.displayLarge,
    color: colors.textPrimary,
  },
  malayalam: {
    ...typography.headingLarge,
    color: colors.accent,
  },
  tagline: {
    ...typography.bodyMalayalam,
    color: colors.textSecondary,
    textAlign: "center",
  },
  loading: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
});
