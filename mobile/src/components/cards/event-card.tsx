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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={testID}
    >
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.hardSmall,
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  pressed: {
    opacity: opacity.pressed,
    ...shadows.none,
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
