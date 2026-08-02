import { Ionicons } from "@expo/vector-icons";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

export interface ScannerOverlayProps {
  groupName: string;
  rollCallName: string;
  flashEnabled: boolean;
  paused?: boolean;
  onToggleFlash: () => void;
  testID?: string;
}

export function ScannerOverlay(props: ScannerOverlayProps): JSX.Element {
  return (
    <View style={styles.container} testID={props.testID}>
      <View style={styles.meta}>
        <Text style={styles.group}>{props.groupName}</Text>
        <Text style={styles.rollCall}>{props.rollCallName}</Text>
        <Text style={styles.connection}>{props.paused ? "PROCESSING" : "READY TO SCAN"}</Text>
      </View>
      <View accessibilityLabel="QR scan frame" accessibilityRole="image" style={styles.frame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
      <Text style={styles.instruction}>Align the member’s group QR inside the frame.</Text>
      <Pressable
        accessibilityLabel={props.flashEnabled ? "Turn flash off" : "Turn flash on"}
        accessibilityRole="button"
        onPress={props.onToggleFlash}
        style={styles.flash}
        testID="scanner-flash-toggle"
      >
        <Ionicons
          color={props.flashEnabled ? colors.accent : colors.textInverse}
          name={props.flashEnabled ? "flash" : "flash-outline"}
          size={layout.iconSize}
        />
        <Text style={styles.flashLabel}>{props.flashEnabled ? "FLASH ON" : "FLASH OFF"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: spacing.none,
    right: spacing.none,
    bottom: spacing.none,
    left: spacing.none,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    padding: spacing.lg,
    paddingTop: spacing["3xl"],
  },
  meta: { alignSelf: "stretch", gap: spacing.half },
  group: { ...typography.headingLarge, color: colors.textInverse },
  rollCall: { ...typography.body, color: colors.gridLine },
  connection: { ...typography.technicalLabel, color: colors.textInverse },
  frame: {
    width: layout.qrPlaceholderSize,
    height: layout.qrPlaceholderSize,
    borderColor: colors.gridLine,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  corner: {
    position: "absolute",
    width: spacing["2xl"],
    height: spacing["2xl"],
    borderColor: colors.accent,
  },
  topLeft: {
    top: spacing.none,
    left: spacing.none,
    borderTopWidth: layout.focusedBorderWidth,
    borderLeftWidth: layout.focusedBorderWidth,
  },
  topRight: {
    top: spacing.none,
    right: spacing.none,
    borderTopWidth: layout.focusedBorderWidth,
    borderRightWidth: layout.focusedBorderWidth,
  },
  bottomLeft: {
    bottom: spacing.none,
    left: spacing.none,
    borderBottomWidth: layout.focusedBorderWidth,
    borderLeftWidth: layout.focusedBorderWidth,
  },
  bottomRight: {
    right: spacing.none,
    bottom: spacing.none,
    borderRightWidth: layout.focusedBorderWidth,
    borderBottomWidth: layout.focusedBorderWidth,
  },
  instruction: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    textAlign: "center",
  },
  flash: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderColor: colors.gridLine,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  flashLabel: { ...typography.button, color: colors.textInverse },
});
