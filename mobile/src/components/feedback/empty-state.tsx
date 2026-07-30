import type { JSX, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

import { PrimaryButton } from "../actions/primary-button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  actionAccessibilityLabel?: string;
  testID?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onActionPress,
  actionAccessibilityLabel,
  testID,
}: EmptyStateProps): JSX.Element {
  return (
    <View accessibilityRole="summary" style={styles.container} testID={testID}>
      {icon}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <PrimaryButton
          accessibilityLabel={actionAccessibilityLabel}
          label={actionLabel}
          onPress={onActionPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: "center",
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
