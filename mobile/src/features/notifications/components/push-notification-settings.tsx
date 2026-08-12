import { useEffect, useState, type JSX } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components";
import { colors, spacing, typography } from "@/theme";

import {
  getPushPermissionState,
  requestAndRegisterPushDevice,
  PushRegistrationError,
  safePushRegistrationMessage,
  type PushPermissionState,
} from "../services/push-notification-service";

export function PushNotificationSettings(): JSX.Element {
  const [state, setState] = useState<PushPermissionState>("not_requested");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrationFailed, setRegistrationFailed] = useState(false);

  useEffect(() => {
    void getPushPermissionState()
      .then(setState)
      .finally(() => setLoading(false));
  }, []);

  async function enable(): Promise<void> {
    setLoading(true);
    setError("");
    setRegistrationFailed(false);
    try {
      setState(await requestAndRegisterPushDevice());
    } catch (failure) {
      if (failure instanceof PushRegistrationError) {
        setState(failure.permissionState);
        setRegistrationFailed(failure.permissionState === "enabled");
        setError(safePushRegistrationMessage(failure.stage));
      } else {
        setState("enabled");
        setRegistrationFailed(true);
        setError(safePushRegistrationMessage("unknown"));
      }
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
      <Text style={styles.state}>{`[ ${
        registrationFailed
          ? "REGISTRATION FAILED"
          : state === "denied"
            ? "DISABLED"
            : state.replace("_", " ").toUpperCase()
      } ]`}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {state === "denied" ? (
        <SecondaryButton
          fullWidth
          label="OPEN SETTINGS"
          onPress={() => void Linking.openSettings()}
          testID="open-notification-settings"
        />
      ) : (state !== "enabled" && state !== "unavailable") || registrationFailed ? (
        <SecondaryButton
          fullWidth
          label={registrationFailed ? "TRY AGAIN" : "ENABLE NOTIFICATIONS"}
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
