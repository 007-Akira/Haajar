import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, ScreenContainer } from "@/components";
import { APP_NAME, APP_VERSION } from "@/constants/app";
import { colors, spacing, typography } from "@/theme";

export function SignInScreen(): JSX.Element {
  const router = useRouter();

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
          accessibilityLabel="Continue with Google using a mock account"
          fullWidth
          label="Continue with Google"
          onPress={() => router.push("/profile-setup")}
          testID="continue-with-google-button"
        />
        <Text style={styles.privacy}>
          This prototype does not contact Google or save account information.
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
  version: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
