import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, layout, radii, spacing, typography } from "@/theme";
import type { Json } from "@/types/database.types";
import { formatAnswerValue } from "@/lib/presentation/member-formatters";
import { LabeledDetailRow } from "./labeled-detail-row";

export { formatAnswerValue } from "@/lib/presentation/member-formatters";

export interface AnswerSummaryItem {
  id: string;
  label: string;
  answer: Json;
}
export interface AnswerSummaryListProps {
  answers: AnswerSummaryItem[];
  emptyMessage?: string;
  testID?: string;
}
export function AnswerSummaryList({
  answers,
  emptyMessage = "No custom answers were required.",
  testID,
}: AnswerSummaryListProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      {answers.length ? (
        answers.map((answer) => (
          <LabeledDetailRow
            key={answer.id}
            label={answer.label}
            value={formatAnswerValue(answer.answer)}
          />
        ))
      ) : (
        <Text style={styles.empty}>{emptyMessage}</Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  empty: { ...typography.body, color: colors.textSecondary },
});
