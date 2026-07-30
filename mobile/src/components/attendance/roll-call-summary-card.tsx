import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import { AttendanceProgress } from "./attendance-progress";
import { StatusBadge } from "../status/status-badge";
import { SyncBadge } from "../status/sync-badge";

export interface RollCallSummaryCardProps {
  name: string;
  groupName: string;
  startedAt: string;
  createdBy: string;
  presentCount: number;
  unmarkedCount: number;
  absentCount?: number;
  pendingSyncCount: number;
  testID?: string;
}

export function RollCallSummaryCard(props: RollCallSummaryCardProps): JSX.Element {
  const total = props.presentCount + props.unmarkedCount + (props.absentCount ?? 0);

  return (
    <View style={styles.card} testID={props.testID}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.name}>{props.name}</Text>
          <Text style={styles.metadata}>{props.groupName}</Text>
          <Text style={styles.metadata}>{`${props.startedAt} · ${props.createdBy}`}</Text>
        </View>
        <StatusBadge status="active" />
      </View>
      <View style={styles.counts}>
        <Metric label="PRESENT" value={props.presentCount} />
        <Metric label="UNMARKED" value={props.unmarkedCount} />
        {props.absentCount !== undefined ? (
          <Metric label="ABSENT" value={props.absentCount} />
        ) : null}
      </View>
      <AttendanceProgress present={props.presentCount} total={total} />
      <View style={styles.syncRow}>
        <SyncBadge state={props.pendingSyncCount > 0 ? "pending" : "synced"} />
        <Text style={styles.pending}>{`${props.pendingSyncCount} pending`}</Text>
      </View>
    </View>
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

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  copy: { flex: 1, gap: spacing.half },
  name: { ...typography.headingMedium, color: colors.textPrimary },
  metadata: { ...typography.caption, color: colors.textSecondary },
  counts: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, gap: spacing.half },
  metricValue: { ...typography.headingLarge, color: colors.textPrimary },
  metricLabel: { ...typography.technicalLabel, color: colors.textSecondary },
  syncRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pending: { ...typography.caption, color: colors.textSecondary },
});
