import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme";

import type { OfflineRosterStatus as Status } from "../types/offline-roster";

export function OfflineRosterStatus({
  onRefresh,
  status,
}: {
  onRefresh: () => void;
  status: Status;
}): JSX.Element {
  const label = {
    ready: "Roster ready offline",
    downloading: "Roster downloading",
    outdated: "Roster outdated",
    unavailable: "Roster unavailable",
    error: "Roster unavailable",
  }[status.state];
  const updated = status.lastUpdatedAt ? formatUpdatedAt(status.lastUpdatedAt) : "Never";

  return (
    <View style={styles.container} testID={`offline-roster-${status.state}`}>
      <View style={styles.copy}>
        <Text style={[styles.label, status.state === "ready" && styles.ready]}>{label}</Text>
        <Text style={styles.meta}>{`Last updated: ${updated}`}</Text>
        {status.errorMessage ? <Text style={styles.error}>{status.errorMessage}</Text> : null}
        {status.state === "outdated" ? (
          <Text style={styles.warning}>Refresh before relying on this roster offline.</Text>
        ) : null}
      </View>
      <SecondaryButton
        accessibilityLabel="Download the latest roll-call roster"
        disabled={status.state === "downloading"}
        label={status.state === "ready" ? "Refresh Roster" : "Download Roster"}
        loading={status.state === "downloading"}
        onPress={onRefresh}
        testID="refresh-offline-roster"
      />
    </View>
  );
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: layout.borderWidth,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadows.hardSmall,
  },
  copy: { gap: spacing.half },
  label: { ...typography.technicalLabel, color: colors.warning },
  ready: { color: colors.success },
  meta: { ...typography.caption, color: colors.textSecondary },
  warning: { ...typography.caption, color: colors.warning },
  error: { ...typography.caption, color: colors.danger },
});
