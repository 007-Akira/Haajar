import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

export type SyncState = "synced" | "pending" | "failed";

export interface SyncBadgeProps {
  state: SyncState;
  testID?: string;
}

const labels: Record<SyncState, string> = {
  synced: "SYNCED",
  pending: "PENDING SYNC",
  failed: "SYNC FAILED",
};

export function SyncBadge({ state, testID }: SyncBadgeProps): JSX.Element {
  return (
    <View
      accessibilityLabel={`Sync status: ${labels[state]}`}
      style={[
        styles.container,
        state === "synced" && styles.synced,
        state === "pending" && styles.pending,
        state === "failed" && styles.failed,
      ]}
      testID={testID}
    >
      <Text style={[styles.label, state === "failed" && styles.failedLabel]}>
        {`[ ${labels[state]} ]`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.half,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  synced: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  pending: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  failed: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  label: {
    ...typography.badge,
    color: colors.textPrimary,
  },
  failedLabel: {
    color: colors.danger,
  },
});
