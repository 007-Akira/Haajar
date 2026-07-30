import { Ionicons } from "@expo/vector-icons";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import { SyncBadge } from "../status/sync-badge";

export interface ScannerOverlayProps {
  groupName: string;
  rollCallName: string;
  online: boolean;
  pendingSyncCount: number;
  flashEnabled: boolean;
  onToggleFlash: () => void;
  testID?: string;
}

export function ScannerOverlay(props: ScannerOverlayProps): JSX.Element {
  return (
    <View style={styles.container} testID={props.testID}>
      <View style={styles.meta}>
        <Text style={styles.group}>{props.groupName}</Text>
        <Text style={styles.rollCall}>{props.rollCallName}</Text>
        <View style={styles.statusRow}>
          <SyncBadge state={props.pendingSyncCount > 0 ? "pending" : "synced"} />
          <Text style={styles.connection}>{props.online ? "ONLINE" : "OFFLINE"}</Text>
        </View>
      </View>
      <View accessibilityLabel="Mock QR scan frame" accessibilityRole="image" style={styles.frame}>
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
  container: { flex: 1, alignItems: "center", justifyContent: "space-between", gap: spacing.lg },
  meta: { alignSelf: "stretch", gap: spacing.half },
  group: { ...typography.headingLarge, color: colors.textInverse },
  rollCall: { ...typography.body, color: colors.gridLine },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
