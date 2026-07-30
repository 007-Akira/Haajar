import type { JSX } from "react";
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

export type Status =
  "active" | "present" | "absent" | "pending" | "synced" | "pending sync" | "error";

export interface StatusBadgeProps {
  status: Status;
  testID?: string;
}

interface StatusAppearance {
  container: ViewStyle;
  text: TextStyle;
}

const statusLabels: Record<Status, string> = {
  active: "ACTIVE",
  present: "PRESENT",
  absent: "ABSENT",
  pending: "PENDING",
  synced: "SYNCED",
  "pending sync": "PENDING SYNC",
  error: "ERROR",
};

const appearances: Record<Status, StatusAppearance> = {
  active: {
    container: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    text: { color: colors.textPrimary },
  },
  present: {
    container: { backgroundColor: colors.successSoft, borderColor: colors.success },
    text: { color: colors.textPrimary },
  },
  absent: {
    container: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    text: { color: colors.danger },
  },
  pending: {
    container: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
    text: { color: colors.textPrimary },
  },
  synced: {
    container: { backgroundColor: colors.successSoft, borderColor: colors.success },
    text: { color: colors.textPrimary },
  },
  "pending sync": {
    container: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
    text: { color: colors.textPrimary },
  },
  error: {
    container: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    text: { color: colors.danger },
  },
};

export function StatusBadge({ status, testID }: StatusBadgeProps): JSX.Element {
  const appearance = appearances[status];

  return (
    <View
      accessibilityLabel={`Status: ${statusLabels[status]}`}
      accessibilityRole="text"
      style={[styles.container, appearance.container]}
      testID={testID}
    >
      <Text style={[styles.label, appearance.text]}>{`[ ${statusLabels[status]} ]`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: layout.badgeMinHeight,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  label: {
    ...typography.badge,
  },
});
