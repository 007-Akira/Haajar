import type { JSX } from "react";
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

export type UserRole = "member" | "co-organiser" | "organiser" | "super organiser";

export interface RoleBadgeProps {
  role: UserRole;
  testID?: string;
}

const roleLabels: Record<UserRole, string> = {
  member: "MEMBER",
  "co-organiser": "CO-ORGANISER",
  organiser: "ORGANISER",
  "super organiser": "SUPER ORGANISER",
};

const roleContainerStyles: Record<UserRole, ViewStyle> = {
  member: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  "co-organiser": {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  organiser: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.surfaceElevated,
  },
  "super organiser": {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
};

const roleTextStyles: Record<UserRole, TextStyle> = {
  member: { color: colors.textPrimary },
  "co-organiser": { color: colors.textPrimary },
  organiser: { color: colors.textInverse },
  "super organiser": { color: colors.textInverse },
};

export function RoleBadge({ role, testID }: RoleBadgeProps): JSX.Element {
  return (
    <View
      accessibilityLabel={`Role: ${roleLabels[role]}`}
      accessibilityRole="text"
      style={[styles.container, roleContainerStyles[role]]}
      testID={testID}
    >
      <Text style={[styles.label, roleTextStyles[role]]}>{`[ ${roleLabels[role]} ]`}</Text>
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
