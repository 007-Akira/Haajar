import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/theme";

export interface LabeledDetailRowProps {
  label: string;
  value: string;
  testID?: string;
}
export function LabeledDetailRow({ label, value, testID }: LabeledDetailRowProps): JSX.Element {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { gap: spacing.half },
  label: { ...typography.technicalLabel, color: colors.textSecondary },
  value: { ...typography.bodyMedium, color: colors.textPrimary },
});
