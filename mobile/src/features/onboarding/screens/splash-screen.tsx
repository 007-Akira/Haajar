import { useEffect } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ScreenContainer } from "@/components";
import { APP_NAME, SPLASH_TRANSITION_MS } from "@/constants/app";
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
        <View style={styles.wordmark}>
          {APP_NAME.toUpperCase()
            .split("")
            .map((letter, index) => (
              <Animated.Text
                entering={FadeInUp.delay(index * 80)
                  .duration(240)
                  .springify()
                  .damping(18)}
                key={`${letter}-${index}`}
                style={styles.letter}
              >
                {letter}
              </Animated.Text>
            ))}
        </View>
      </View>
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
    backgroundColor: colors.textPrimary,
  },
  brand: {
    alignItems: "center",
    gap: spacing.xs,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.half,
  },
  letter: {
    ...typography.displayLarge,
    color: colors.textInverse,
  },
  loading: {
    ...typography.technicalLabel,
    color: colors.surfaceVariant,
  },
});
