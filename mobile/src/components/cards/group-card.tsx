import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, opacity, radii, spacing, typography } from "@/theme";

import { RoleBadge, type UserRole } from "../status/role-badge";
import { StatusBadge } from "../status/status-badge";

export interface GroupCardProps {
  groupName: string;
  memberCount: number;
  userRole: UserRole;
  activeRollCall?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function GroupCard({
  groupName,
  memberCount,
  userRole,
  activeRollCall = false,
  onPress,
  accessibilityLabel,
  testID,
}: GroupCardProps): JSX.Element {
  return (
    <Pressable
      accessibilityLabel={
        accessibilityLabel ?? `Open ${groupName}, ${memberCount} members, role ${userRole}`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.name}>{groupName}</Text>
          <Text style={styles.count}>{`${memberCount} MEMBERS`}</Text>
        </View>
        {activeRollCall ? <StatusBadge status="active" /> : null}
      </View>
      <View style={styles.footer}>
        <RoleBadge role={userRole} />
        <Text style={styles.openLabel}>[ OPEN → ]</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  pressed: {
    backgroundColor: colors.gridLine,
    opacity: opacity.pressed,
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
  name: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  count: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  openLabel: {
    ...typography.button,
    color: colors.accent,
  },
});
