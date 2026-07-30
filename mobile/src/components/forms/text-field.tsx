import { forwardRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, layout, opacity, radii, spacing, typography } from "@/theme";

export interface TextFieldProps extends Omit<
  TextInputProps,
  "accessibilityLabel" | "editable" | "onBlur" | "onFocus" | "placeholder" | "testID" | "value"
> {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: TextInputProps["onFocus"];
  onBlur?: TextInputProps["onBlur"];
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    placeholder,
    value,
    onChangeText,
    onFocus,
    onBlur,
    error,
    helperText,
    disabled = false,
    required = false,
    accessibilityLabel,
    testID,
    ...inputProps
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const supportingText = error ?? helperText;
  const supportingTextID = testID ? `${testID}-supporting-text` : undefined;

  function handleFocus(event: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]): void {
    setFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]): void {
    setFocused(false);
    onBlur?.(event);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {`[ ${label.toUpperCase()} ]`}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        {...inputProps}
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="text"
        accessibilityState={{ disabled }}
        editable={!disabled}
        onBlur={handleBlur}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          focused && styles.focused,
          error && styles.error,
          disabled && styles.disabled,
        ]}
        testID={testID}
        value={value}
      />
      {supportingText ? (
        <Text
          accessibilityRole={error ? "alert" : "text"}
          nativeID={supportingTextID}
          style={[styles.supporting, error && styles.errorText]}
        >
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  required: {
    color: colors.danger,
  },
  input: {
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  focused: {
    borderColor: colors.accent,
    borderWidth: layout.focusedBorderWidth,
  },
  error: {
    borderColor: colors.danger,
    borderWidth: layout.focusedBorderWidth,
  },
  disabled: {
    backgroundColor: colors.gridLine,
    opacity: opacity.disabled,
  },
  supporting: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
  },
});
