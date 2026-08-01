import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";
import { getInitials } from "@/lib/presentation/member-formatters";
export { getInitials } from "@/lib/presentation/member-formatters";

export interface InitialsBadgeProps {
  name: string;
  testID?: string;
}

export function InitialsBadge({ name, testID }: InitialsBadgeProps): JSX.Element {
  return (
    <View accessibilityLabel={`${name} initials`} style={styles.container} testID={testID}>
      <Text style={styles.text}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
    padding: spacing.half,
  },
  text: { ...typography.badge, color: colors.textPrimary },
});
