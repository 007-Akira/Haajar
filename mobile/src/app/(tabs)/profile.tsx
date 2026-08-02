import { useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PageHeader, ScreenContainer, SecondaryButton } from "@/components";
import { useSession } from "@/features/auth";
import { PushNotificationSettings } from "@/features/notifications";
import { colors, spacing, typography } from "@/theme";

export default function ProfileRoute(): JSX.Element {
  const router = useRouter();
  const { profile, signOut, user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer contentContainerStyle={styles.content} scroll testID="profile-screen">
      <PageHeader subtitle="Your Haajar account details." title="Profile" />
      <View style={styles.details}>
        <Text style={styles.label}>[ FULL NAME ]</Text>
        <Text style={styles.value}>{profile?.full_name}</Text>
        <Text style={styles.label}>[ EMAIL ]</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>[ PHONE ]</Text>
        <Text style={styles.value}>{profile?.phone}</Text>
      </View>
      <PushNotificationSettings />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <SecondaryButton
        accessibilityLabel="Sign out of Haajar"
        fullWidth
        label="Sign Out"
        loading={loading}
        onPress={() => void handleSignOut()}
        testID="sign-out-button"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
  },
  details: {
    gap: spacing.sm,
  },
  label: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  value: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
