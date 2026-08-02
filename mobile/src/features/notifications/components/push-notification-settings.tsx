import { useEffect, useState, type JSX } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components";
import { colors, spacing, typography } from "@/theme";

import {
  getPushPermissionState,
  requestAndRegisterPushDevice,
  type PushPermissionState,
} from "../services/push-notification-service";

export function PushNotificationSettings(): JSX.Element {
  const [state, setState] = useState<PushPermissionState>("not_requested");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void getPushPermissionState()
      .then(setState)
      .finally(() => setLoading(false));
  }, []);

  async function enable(): Promise<void> {
    setLoading(true);
    setError("");
    try {
      setState(await requestAndRegisterPushDevice());
    } catch {
      setError("Notifications could not be enabled. Check the build configuration and retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container} testID="push-notification-settings">
      <Text style={styles.title}>Roll-call notifications</Text>
      <Text style={styles.description}>
        Receive operational alerts when a roll call starts in one of your groups.
      </Text>
      <Text style={styles.state}>{`[ ${state.replace("_", " ").toUpperCase()} ]`}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {state === "denied" ? (
        <SecondaryButton
          fullWidth
          label="Open Android Settings"
          onPress={() => void Linking.openSettings()}
          testID="open-notification-settings"
        />
      ) : state !== "enabled" && state !== "unavailable" ? (
        <SecondaryButton
          fullWidth
          label="Enable Notifications"
          loading={loading}
          onPress={() => void enable()}
          testID="enable-push-notifications"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { ...typography.headingSmall, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  state: { ...typography.technicalLabel, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
});
