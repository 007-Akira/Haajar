import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme";

import type { RollCallHistoryItem } from "../types/attendance-contracts";

export interface RollCallHistoryRowProps {
  item: RollCallHistoryItem;
  onPress: () => void;
  testID?: string;
}

export function RollCallHistoryRow({
  item,
  onPress,
  testID,
}: RollCallHistoryRowProps): JSX.Element {
  return (
    <Pressable
      accessibilityLabel={`Open ${item.title}, ${item.status}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{formatDateTime(item.startedAt)}</Text>
          <Text style={styles.meta}>
            {item.closedAt ? `Closed ${formatTime(item.closedAt)}` : "Currently active"}
          </Text>
          <Text style={styles.meta}>{`Started by ${item.createdByName}`}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.metrics}>
        <Metric label="PRESENT" value={item.presentCount} />
        <Metric label="ROSTER" value={item.totalRoster} />
      </View>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
    ...shadows.hardSmall,
  },
  pressed: { backgroundColor: colors.accentSoft },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  copy: { flex: 1, gap: spacing.half },
  title: { ...typography.headingSmall, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  metrics: { flexDirection: "row", gap: spacing.lg },
  metric: { gap: spacing.half },
  metricValue: { ...typography.headingMedium, color: colors.textPrimary },
  metricLabel: { ...typography.technicalLabel, color: colors.textSecondary },
});
