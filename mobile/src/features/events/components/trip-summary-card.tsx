import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { RoleBadge, StatusBadge, type UserRole } from "@/components";
import { colors, layout, radii, spacing, typography } from "@/theme";

export interface TripSummaryCardProps {
  eventName: string;
  participantCount: number;
  groupCount: number;
  userRole: UserRole;
  activeRollCallLabel?: string;
  testID?: string;
}

export function TripSummaryCard({
  eventName,
  participantCount,
  groupCount,
  userRole,
  activeRollCallLabel,
  testID,
}: TripSummaryCardProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.eventName}>{eventName}</Text>
        <RoleBadge role={userRole} />
      </View>
      <View style={styles.counts}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{participantCount}</Text>
          <Text style={styles.metricLabel}>PARTICIPANTS</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{groupCount}</Text>
          <Text style={styles.metricLabel}>GROUPS</Text>
        </View>
      </View>
      {activeRollCallLabel ? (
        <View style={styles.activeStatus}>
          <StatusBadge status="active" />
          <Text style={styles.activeLabel}>{activeRollCallLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  eventName: {
    ...typography.headingMedium,
    flex: 1,
    color: colors.textPrimary,
  },
  counts: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    gap: spacing.half,
    paddingTop: spacing.sm,
    borderTopColor: colors.gridLine,
    borderTopWidth: layout.borderWidth,
  },
  metricValue: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  activeStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeLabel: {
    ...typography.caption,
    flex: 1,
    color: colors.textSecondary,
  },
});
