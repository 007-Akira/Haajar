import type { JSX, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, spacing, typography } from "@/theme";

import { IconButton } from "../actions/icon-button";

export interface PageHeaderAction {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leadingAction?: PageHeaderAction;
  trailingAction?: PageHeaderAction;
  testID?: string;
}

export function PageHeader({
  title,
  subtitle,
  leadingAction,
  trailingAction,
  testID,
}: PageHeaderProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      {leadingAction ? <IconButton {...leadingAction} /> : null}
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>HAAJAR / FIELD OPERATIONS</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title.toUpperCase()}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailingAction ? <IconButton {...trailingAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: layout.focusedBorderWidth,
    borderBottomColor: colors.borderStrong,
    overflow: "hidden",
  },
  copy: {
    flex: 1,
    gap: spacing.half,
  },
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  eyebrow: {
    ...typography.technicalLabel,
    color: colors.accent,
  },
});
