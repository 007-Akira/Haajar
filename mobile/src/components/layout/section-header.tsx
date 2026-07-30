import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, opacity, spacing, typography } from "@/theme";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  actionAccessibilityLabel?: string;
  actionTestID?: string;
  testID?: string;
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  onActionPress,
  actionAccessibilityLabel,
  actionTestID,
  testID,
}: SectionHeaderProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={onActionPress}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          testID={actionTestID}
        >
          <Text style={styles.actionText}>{`[ ${actionLabel.toUpperCase()} ]`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  copy: {
    flex: 1,
    gap: spacing.half,
  },
  title: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  action: {
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
  },
  actionPressed: {
    opacity: opacity.pressed,
  },
  actionText: {
    ...typography.technicalLabel,
    color: colors.accent,
  },
});
