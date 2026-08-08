import type { JSX, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, opacity, radii, shadows, spacing, typography } from "@/theme";

export interface ButtonBaseProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  highContrast?: boolean;
  testID?: string;
}

interface InternalButtonProps extends ButtonBaseProps {
  variant: "primary" | "secondary";
}

export function ButtonBase({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  loading = false,
  fullWidth = false,
  leadingIcon,
  highContrast = false,
  testID,
  variant,
}: InternalButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        highContrast && styles.highContrast,
        fullWidth && styles.fullWidth,
        pressed &&
          (highContrast
            ? styles.highContrastPressed
            : isPrimary
              ? styles.primaryPressed
              : styles.secondaryPressed),
        isDisabled && styles.disabled,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textInverse : colors.textPrimary} />
      ) : (
        <View style={styles.content}>
          {leadingIcon}
          <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
            {label.toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  primary: {
    ...shadows.hardSmall,
    backgroundColor: colors.accent,
    borderColor: colors.textPrimary,
  },
  primaryPressed: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
    ...shadows.none,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  highContrast: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.accent,
  },
  highContrastPressed: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.textPrimary,
    ...shadows.none,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  secondary: {
    ...shadows.hardSmall,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  secondaryPressed: {
    backgroundColor: colors.gridLine,
    ...shadows.none,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  disabled: {
    opacity: opacity.disabled,
    ...shadows.none,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  label: {
    ...typography.button,
  },
  primaryLabel: {
    color: colors.textInverse,
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
});
