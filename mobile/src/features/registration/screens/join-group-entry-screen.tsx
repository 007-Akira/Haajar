import { useState } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text } from "react-native";

import { PageHeader, PrimaryButton, ScreenContainer, TextField } from "@/components";
import { colors, spacing, typography } from "@/theme";

import { normalizeJoinTokenInput } from "../types/registration-models";

export function JoinGroupEntryScreen(): JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const token = normalizeJoinTokenInput(code);
  const error =
    submitted && token.length !== 24 ? "Enter a valid 24-character join code." : undefined;

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="join-group-entry"
    >
      <PageHeader
        subtitle="Enter a join code or paste a Haajar invitation link."
        title="Join Group"
      />
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        helperText="Invitation QR payloads use the same Haajar link. Camera scanning comes later."
        label="Join code or link"
        onChangeText={setCode}
        placeholder="e.g. a1b2c3d4..."
        required
        testID="join-code-field"
        value={code}
      />
      <PrimaryButton
        fullWidth
        label="Preview Invitation"
        onPress={() => {
          setSubmitted(true);
          if (token.length === 24) router.push(`/join/${token}` as never);
        }}
        testID="preview-invitation-button"
      />
      <Text style={styles.note}>[ GROUP UUIDS ARE NOT USED IN INVITATION LINKS ]</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  note: { ...typography.technicalLabel, color: colors.textSecondary, textAlign: "center" },
});
