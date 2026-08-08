import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, opacity, radii, shadows, spacing, typography } from "@/theme";

import { RoleBadge, type UserRole } from "../status/role-badge";
import { StatusBadge } from "../status/status-badge";

export interface EventCardProps {
  eventName: string;
  date?: string;
  participantCount: number;
  groupCount: number;
  userRole: UserRole;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function EventCard({
  eventName,
  date,
  participantCount,
  groupCount,
  userRole,
  active,
  onPress,
  accessibilityLabel,
  testID,
}: EventCardProps): JSX.Element {
  const summary = `${participantCount} participants, ${groupCount} groups`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `${eventName}, ${summary}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        active ? styles.activeCard : styles.archivedCard,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={[styles.indexRail, active ? styles.activeRail : styles.archivedRail]}>
        <Text style={[styles.index, !active && styles.archivedIndex]}>{active ? "01" : "02"}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>{eventName}</Text>
            {date ? <Text style={styles.date}>{date}</Text> : null}
          </View>
          {active ? <StatusBadge status="active" /> : null}
        </View>
        <View style={styles.rule} />
        <View style={styles.footer}>
          <Text style={styles.metadata}>{summary.toUpperCase()}</Text>
          <RoleBadge role={userRole} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.hardSmall,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  activeCard: { opacity: 1 },
  archivedCard: { opacity: 0.8, borderStyle: "dashed", ...shadows.none },
  indexRail: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: layout.borderWidth,
    borderRightColor: colors.borderStrong,
  },
  activeRail: { backgroundColor: colors.textPrimary },
  archivedRail: { backgroundColor: colors.surfaceVariant, borderStyle: "dashed" },
  index: { ...typography.headingLarge, color: colors.textInverse },
  archivedIndex: { color: colors.textSecondary, opacity: 0.55 },
  content: { flex: 1, gap: spacing.md, padding: spacing.md },
  pressed: {
    opacity: opacity.pressed,
    ...shadows.none,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    gap: spacing.half,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  date: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rule: {
    height: layout.borderWidth,
    backgroundColor: colors.gridLine,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metadata: {
    ...typography.technicalLabel,
    flex: 1,
    color: colors.textSecondary,
  },
});
