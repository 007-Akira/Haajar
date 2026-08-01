import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, ScreenContainer } from "@/components";
import { APP_NAME, APP_VERSION } from "@/constants/app";
import { useSession } from "@/features/auth/providers/session-provider";
import { colors, spacing, typography } from "@/theme";
import { safeAuthReturnTo } from "../services/auth-return";

export function SignInScreen(): JSX.Element {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const { configurationError, loading, profile, profileLoading, session, signInWithGoogle } =
    useSession();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || profileLoading || !session) {
      return;
    }
    if (profile?.profile_completed) {
      router.replace(safeReturnTo as never);
    } else {
      router.replace({ pathname: "/profile-setup", params: { returnTo: safeReturnTo } });
    }
  }, [loading, profile, profileLoading, router, safeReturnTo, session]);

  async function handleGoogleSignIn(): Promise<void> {
    setSubmitting(true);
    setAuthError(null);
    try {
      const completed = await signInWithGoogle();
      if (!completed) return;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign in with Google.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content} scroll showGrid testID="sign-in-screen">
      <View style={styles.brandBlock}>
        <Text accessibilityRole="header" style={styles.brand}>
          {APP_NAME}
        </Text>
        <Text style={styles.headline}>{"Every group.\nEvery member.\nAccounted for."}</Text>
        <Text style={styles.supportingCopy}>
          Create trips, organise groups, and run fast QR roll calls.
        </Text>
      </View>

      <View style={styles.actionBlock}>
        <PrimaryButton
          accessibilityLabel="Continue with Google"
          disabled={Boolean(configurationError)}
          fullWidth
          label="Continue with Google"
          loading={submitting}
          onPress={() => void handleGoogleSignIn()}
          testID="continue-with-google-button"
        />
        {authError || configurationError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error} testID="sign-in-error">
            {authError ?? configurationError}
          </Text>
        ) : null}
        <Text style={styles.privacy}>
          Google verifies your identity. Haajar stores only the account details needed for your
          profile.
        </Text>
        <Text style={styles.version}>{`[ VERSION ${APP_VERSION} ]`}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: "space-between",
    gap: spacing["3xl"],
  },
  brandBlock: {
    gap: spacing.lg,
    paddingTop: spacing["2xl"],
  },
  brand: {
    ...typography.displayLarge,
    color: colors.accent,
  },
  headline: {
    ...typography.displayMedium,
    color: colors.textPrimary,
  },
  supportingCopy: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  actionBlock: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  privacy: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
  version: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
