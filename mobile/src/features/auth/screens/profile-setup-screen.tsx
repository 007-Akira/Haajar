import { useState } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PageHeader, PhoneField, PrimaryButton, ScreenContainer, TextField } from "@/components";
import { mockUser } from "@/features/home/data/mock-home";
import { colors, spacing, typography } from "@/theme";

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function ProfileSetupScreen(): JSX.Element {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !fullName.trim() ? "Enter your full name." : undefined;
  const phoneError = submitted && !isValidPhone(phone) ? "Enter a valid phone number." : undefined;

  function handleSubmit(): void {
    setSubmitted(true);

    if (!fullName.trim() || !isValidPhone(phone)) {
      return;
    }

    router.replace("/(tabs)");
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
          helperText="Verified by the mock Google account."
          label="Google email"
          onChangeText={() => undefined}
          testID="verified-email-field"
          value={mockUser.verifiedEmail}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.localNote}>[ SAVED LOCALLY FOR THIS SESSION ONLY ]</Text>
        <PrimaryButton
          accessibilityLabel="Save profile and continue to Home"
          fullWidth
          label="Save and Continue"
          onPress={handleSubmit}
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
});
