import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, opacity, radii, spacing, typography } from "@/theme";

export interface ActiveRollCallNoticeProps {
  tripName: string;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function ActiveRollCallNotice({
  tripName,
  label,
  onPress,
  accessibilityLabel,
  testID,
}: ActiveRollCallNoticeProps): JSX.Element {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `${label} for ${tripName}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={styles.statusDot} />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>[ ACTIVE ROLL CALL ]</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.trip}>{tripName}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  statusDot: {
    width: layout.statusDotSize,
    height: layout.statusDotSize,
    marginTop: spacing.half,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  copy: {
    flex: 1,
    gap: spacing.half,
  },
  eyebrow: {
    ...typography.badge,
    color: colors.accentPressed,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  trip: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
