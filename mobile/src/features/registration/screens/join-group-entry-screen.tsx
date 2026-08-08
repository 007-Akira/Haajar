import { useState } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  TextField,
} from "@/components";
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
      <PageHeader subtitle="Enter the private code shared by your organiser." title="Join Group" />
      <Text style={styles.method}>[ ENTER JOIN CODE ]</Text>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        helperText="You can also paste a Haajar invitation link."
        label="Join code"
        onChangeText={setCode}
        placeholder="e.g. a1b2c3d4..."
        required
        testID="join-code-field"
        value={code}
      />
      <PrimaryButton
        fullWidth
        label="Continue"
        onPress={() => {
          setSubmitted(true);
          if (token.length === 24) router.push(`/join/${token}` as never);
        }}
        testID="preview-invitation-button"
      />
      <View style={styles.divider}>
        <View style={styles.rule} />
        <Text style={styles.or}>OR</Text>
        <View style={styles.rule} />
      </View>
      <Text style={styles.method}>[ SCAN INVITATION QR ]</Text>
      <SecondaryButton
        fullWidth
        label="Open Camera Scanner"
        onPress={() => router.push("/join/scan" as never)}
        testID="scan-invitation-qr-button"
      />
      <Text style={styles.note}>[ GROUP UUIDS ARE NOT USED IN INVITATION LINKS ]</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  method: { ...typography.technicalLabel, color: colors.accent },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderStrong },
  or: { ...typography.technicalLabel, color: colors.textSecondary },
  note: { ...typography.technicalLabel, color: colors.textSecondary, textAlign: "center" },
});
