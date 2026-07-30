import { useEffect } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components";
import { APP_NAME, APP_NAME_MALAYALAM, APP_TAGLINE, SPLASH_TRANSITION_MS } from "@/constants/app";
import { useSession } from "@/features/auth/providers/session-provider";
import { colors, spacing, typography } from "@/theme";

export function SplashScreen(): JSX.Element {
  const router = useRouter();
  const { loading, profile, profileLoading, session } = useSession();

  useEffect(() => {
    if (loading || profileLoading) {
      return undefined;
    }

    const transition = setTimeout(() => {
      if (!session) {
        router.replace("/sign-in");
      } else if (!profile?.profile_completed) {
        router.replace("/profile-setup");
      } else {
        router.replace("/(tabs)");
      }
    }, SPLASH_TRANSITION_MS);

    return () => clearTimeout(transition);
  }, [loading, profile, profileLoading, router, session]);

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
