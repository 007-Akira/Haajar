import { Ionicons } from "@expo/vector-icons";
import type { JSX } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { IconButton, SecondaryButton, TextField } from "@/components";
import { colors, layout, opacity, radii, spacing, typography } from "@/theme";

import {
  registrationQuestionTypes,
  type EditableRegistrationQuestion,
  type RegistrationQuestionType,
} from "../types/registration-models";

export interface RegistrationQuestionEditorProps {
  question: EditableRegistrationQuestion;
  index: number;
  total: number;
  error?: string;
  onChange: (question: EditableRegistrationQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  testID?: string;
}

const optionQuestionTypes = new Set<RegistrationQuestionType>([
  "single_choice",
  "multiple_choice",
  "dropdown",
]);

const questionTypeLabels: Record<RegistrationQuestionType, string> = {
  short_text: "Short text",
  number: "Number",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  dropdown: "Dropdown",
  yes_no: "Yes / No",
  phone: "Phone",
};

function defaultOptions() {
  return [
    { label: "Option 1", value: "option_1", position: 0 },
    { label: "Option 2", value: "option_2", position: 1 },
  ];
}

export function RegistrationQuestionEditor({
  question,
  index,
  total,
  error,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  testID,
}: RegistrationQuestionEditorProps): JSX.Element {
  const usesOptions = optionQuestionTypes.has(question.questionType);

  function changeType(questionType: RegistrationQuestionType): void {
    const nextUsesOptions = optionQuestionTypes.has(questionType);
    onChange({
      ...question,
      questionType,
      options: nextUsesOptions
        ? question.options.length >= 2
          ? question.options
          : defaultOptions()
        : [],
    });
  }

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.number}>{`QUESTION ${index + 1}`}</Text>
        <View style={styles.reorderActions}>
          <IconButton
            accessibilityLabel={`Move question ${index + 1} up`}
            disabled={index === 0}
            icon={<Ionicons color={colors.textPrimary} name="arrow-up" size={layout.iconSize} />}
            onPress={onMoveUp}
            testID={`${testID}-move-up`}
          />
          <IconButton
            accessibilityLabel={`Move question ${index + 1} down`}
            disabled={index === total - 1}
            icon={<Ionicons color={colors.textPrimary} name="arrow-down" size={layout.iconSize} />}
            onPress={onMoveDown}
            testID={`${testID}-move-down`}
          />
          <IconButton
            accessibilityLabel={`Delete question ${index + 1}`}
            icon={<Ionicons color={colors.danger} name="trash-outline" size={layout.iconSize} />}
            onPress={onDelete}
            testID={`${testID}-delete`}
          />
        </View>
      </View>

      <TextField
        error={error}
        label="Question label"
        onChangeText={(label) => onChange({ ...question, label })}
        placeholder="Enter the question"
        required
        testID={`${testID}-label`}
        value={question.label}
      />

      <View style={styles.typeSection}>
        <Text style={styles.technicalLabel}>[ QUESTION TYPE ]</Text>
        <View style={styles.typeGrid}>
          {registrationQuestionTypes.map((type) => {
            const selected = type === question.questionType;
            return (
              <Pressable
                key={type}
                accessibilityLabel={`Question type ${questionTypeLabels[type]}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => changeType(type)}
                style={({ pressed }) => [
                  styles.typeChip,
                  selected && styles.typeChipSelected,
                  pressed && styles.pressed,
                ]}
                testID={`${testID}-type-${type}`}
              >
                <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
                  {questionTypeLabels[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.requiredRow}>
        <View style={styles.requiredCopy}>
          <Text style={styles.requiredTitle}>Required answer</Text>
          <Text style={styles.requiredDescription}>Members must answer before submitting.</Text>
        </View>
        <Switch
          accessibilityLabel={`Question ${index + 1} required`}
          onValueChange={(isRequired) => onChange({ ...question, isRequired })}
          testID={`${testID}-required`}
          thumbColor={colors.surface}
          trackColor={{ false: colors.border, true: colors.accent }}
          value={question.isRequired}
        />
      </View>

      {usesOptions ? (
        <View style={styles.optionsSection}>
          <Text style={styles.technicalLabel}>[ OPTIONS ]</Text>
          {question.options.map((option, optionIndex) => (
            <View key={`${question.clientId}-option-${optionIndex}`} style={styles.optionRow}>
              <View style={styles.optionField}>
                <TextField
                  label={`Option ${optionIndex + 1}`}
                  onChangeText={(label) => {
                    const options = question.options.map((current, currentIndex) =>
                      currentIndex === optionIndex
                        ? {
                            ...current,
                            label,
                            value: label.trim().toLowerCase().replace(/\s+/g, "_"),
                          }
                        : current
                    );
                    onChange({ ...question, options });
                  }}
                  testID={`${testID}-option-${optionIndex}`}
                  value={option.label}
                />
              </View>
              <IconButton
                accessibilityLabel={`Remove option ${optionIndex + 1}`}
                disabled={question.options.length <= 2}
                icon={<Ionicons color={colors.danger} name="close" size={layout.iconSize} />}
                onPress={() =>
                  onChange({
                    ...question,
                    options: question.options
                      .filter((_, currentIndex) => currentIndex !== optionIndex)
                      .map((current, position) => ({ ...current, position })),
                  })
                }
                testID={`${testID}-remove-option-${optionIndex}`}
              />
            </View>
          ))}
          <SecondaryButton
            accessibilityLabel={`Add option to question ${index + 1}`}
            fullWidth
            label="Add Option"
            onPress={() => {
              const nextNumber = question.options.length + 1;
              onChange({
                ...question,
                options: [
                  ...question.options,
                  {
                    label: `Option ${nextNumber}`,
                    value: `option_${nextNumber}`,
                    position: question.options.length,
                  },
                ],
              });
            }}
            testID={`${testID}-add-option`}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  number: {
    ...typography.technicalLabel,
    color: colors.accent,
  },
  reorderActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  typeSection: {
    gap: spacing.sm,
  },
  technicalLabel: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  typeChip: {
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  typeChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  typeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  typeTextSelected: {
    color: colors.textPrimary,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  requiredRow: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  requiredCopy: {
    flex: 1,
    gap: spacing.half,
  },
  requiredTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  requiredDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  optionsSection: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  optionField: {
    flex: 1,
  },
});
