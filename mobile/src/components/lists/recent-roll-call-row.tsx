import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StatusBadge, type Status } from "@/components/status/status-badge";
import { colors, layout, radii, spacing, typography } from "@/theme";

export interface RecentRollCallRowProps {
  name: string;
  date: string;
  attendanceLabel: string;
  status: Extract<Status, "active" | "synced" | "pending sync">;
  testID?: string;
}

export function RecentRollCallRow({
  name,
  date,
  attendanceLabel,
  status,
  testID,
}: RecentRollCallRowProps): JSX.Element {
  return (
    <View
      accessibilityLabel={`${name}, ${date}, ${attendanceLabel}, status ${status}`}
      style={styles.container}
      testID={testID}
    >
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.attendance}>{attendanceLabel.toUpperCase()}</Text>
      </View>
      <StatusBadge status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.half,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  attendance: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
});
