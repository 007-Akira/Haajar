import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

export interface AttendanceProgressProps {
  present: number;
  total: number;
  testID?: string;
}

export function AttendanceProgress({
  present,
  total,
  testID,
}: AttendanceProgressProps): JSX.Element {
  const percentage = total > 0 ? Math.min(100, Math.round((present / total) * 100)) : 0;

  return (
    <View
      accessibilityLabel={`${present} of ${total} present, ${percentage} percent`}
      accessibilityRole="progressbar"
      style={styles.container}
      testID={testID}
    >
      <View style={styles.labels}>
        <Text style={styles.label}>ATTENDANCE PROGRESS</Text>
        <Text style={styles.value}>{`${percentage}%`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  label: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  value: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  track: {
    height: spacing.xs,
    overflow: "hidden",
    backgroundColor: colors.gridLine,
    borderRadius: radii.pill,
  },
  fill: {
    height: layout.fullWidth,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
});
