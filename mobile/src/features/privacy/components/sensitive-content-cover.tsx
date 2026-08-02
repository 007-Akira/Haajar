import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

export function SensitiveContentCover(): JSX.Element {
  return (
    <View
      accessibilityLabel="Sensitive content hidden"
      style={styles.cover}
      testID="sensitive-content-cover"
    >
      <Text style={styles.title}>Haajar</Text>
      <Text style={styles.message}>Sensitive content hidden while the app is inactive.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: "absolute",
    top: spacing.none,
    right: spacing.none,
    bottom: spacing.none,
    left: spacing.none,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  title: { ...typography.displayMedium, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
});
