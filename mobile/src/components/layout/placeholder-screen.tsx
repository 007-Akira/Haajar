import type { JSX } from "react";
import { StyleSheet, Text } from "react-native";

import { colors, spacing, typography } from "@/theme";

import { ScreenContainer } from "./screen-container";

export interface PlaceholderScreenProps {
  title: string;
  description: string;
  testID?: string;
}

export function PlaceholderScreen({
  title,
  description,
  testID,
}: PlaceholderScreenProps): JSX.Element {
  return (
    <ScreenContainer contentContainerStyle={styles.content} showGrid testID={testID}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
