import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import type { EditableRegistrationQuestion } from "../types/registration-models";

const typeLabels = {
  short_text: "SHORT TEXT",
  number: "NUMBER",
  single_choice: "SINGLE CHOICE",
  multiple_choice: "MULTIPLE CHOICE",
  dropdown: "DROPDOWN",
  yes_no: "YES / NO",
  phone: "PHONE",
} as const;

export interface RegistrationFormPreviewProps {
  questions: EditableRegistrationQuestion[];
  testID?: string;
}

export function RegistrationFormPreview({
  questions,
  testID,
}: RegistrationFormPreviewProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.intro}>
        <Text style={styles.introLabel}>[ MEMBER PREVIEW ]</Text>
        <Text style={styles.introText}>
          This is how the registration form will appear to members.
        </Text>
      </View>
      {questions.map((question, index) => (
        <View key={question.clientId} style={styles.question}>
          <Text style={styles.label}>
            {`${index + 1}. ${question.label}`}
            {question.isRequired ? <Text style={styles.required}> *</Text> : null}
          </Text>
          <Text style={styles.type}>{`[ ${typeLabels[question.questionType]} ]`}</Text>
          {question.options.length > 0 ? (
            <View style={styles.options}>
              {question.options.map((option) => (
                <View key={`${question.clientId}-${option.position}`} style={styles.option}>
                  <View style={styles.optionMarker} />
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.inputPlaceholder} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  intro: {
    gap: spacing.half,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  introLabel: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  introText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  question: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  required: {
    color: colors.danger,
  },
  type: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  inputPlaceholder: {
    minHeight: layout.inputHeight,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  options: {
    gap: spacing.xs,
  },
  option: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionMarker: {
    width: spacing.md,
    height: spacing.md,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.pill,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
