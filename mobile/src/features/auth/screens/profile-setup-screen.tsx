import { useEffect, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PageHeader, PhoneField, PrimaryButton, ScreenContainer, TextField } from "@/components";
import { useSession } from "@/features/auth/providers/session-provider";
import { colors, spacing, typography } from "@/theme";
import { safeAuthReturnTo } from "../services/auth-return";

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function ProfileSetupScreen(): JSX.Element {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const { loading, profile, profileLoading, saveProfile, session, user } = useSession();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoading && profile?.profile_completed) {
      router.replace(safeReturnTo as never);
    }
  }, [profile, profileLoading, router, safeReturnTo]);

  const nameError = submitted && !fullName.trim() ? "Enter your full name." : undefined;
  const phoneError = submitted && !isValidPhone(phone) ? "Enter a valid phone number." : undefined;

  async function handleSubmit(): Promise<void> {
    setSubmitted(true);
    setSaveError(null);

    if (!fullName.trim() || !isValidPhone(phone)) {
      return;
    }

    setSaving(true);
    try {
      await saveProfile({ fullName, phone });
      router.replace(safeReturnTo as never);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!loading && !session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="profile-setup-screen"
    >
      <PageHeader
        subtitle="Add the details organisers will use during trips."
        title="Set up your profile"
      />

      <View style={styles.form}>
        <TextField
          autoCapitalize="words"
          error={nameError}
          label="Full name"
          onChangeText={setFullName}
          placeholder="Your full name"
          required
          testID="full-name-field"
          value={fullName}
        />
        <PhoneField
          error={phoneError}
          helperText="Use a number organisers can call during a trip."
          label="Phone number"
          onChangeText={setPhone}
          placeholder="+91 00000 00000"
          required
          testID="phone-number-field"
          value={phone}
        />
        <TextField
          disabled
          helperText="Verified by your Google account."
          label="Google email"
          onChangeText={() => undefined}
          testID="verified-email-field"
          value={user?.email ?? ""}
        />
      </View>

      <View style={styles.footer}>
        {saveError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error} testID="profile-save-error">
            {saveError}
          </Text>
        ) : null}
        <Text style={styles.localNote}>[ STORED SECURELY IN YOUR HAAJAR PROFILE ]</Text>
        <PrimaryButton
          accessibilityLabel="Save profile and continue to Home"
          fullWidth
          label="Save and Continue"
          loading={saving || profileLoading}
          onPress={() => void handleSubmit()}
          testID="save-profile-button"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing["2xl"],
  },
  form: {
    gap: spacing.xl,
  },
  footer: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  localNote: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
    textAlign: "center",
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
});
