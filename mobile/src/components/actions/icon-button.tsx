import type { JSX, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { colors, layout, opacity, radii, shadows } from "@/theme";

export interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled = false,
  loading = false,
  testID,
}: IconButtonProps): JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={layout.gridLineWidth}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      testID={testID}
    >
      {loading ? <ActivityIndicator color={colors.textPrimary} /> : icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    ...shadows.hardSmall,
    width: layout.iconButtonSize,
    height: layout.iconButtonSize,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  pressed: {
    backgroundColor: colors.gridLine,
    opacity: opacity.pressed,
    ...shadows.none,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
