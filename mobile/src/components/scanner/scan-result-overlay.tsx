import type { JSX } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import { SecondaryButton } from "../actions/secondary-button";
import { SyncBadge, type SyncState } from "../status/sync-badge";

export type ScanResultTone = "success" | "warning" | "error";

export interface ScanResultOverlayProps {
  visible: boolean;
  tone: ScanResultTone;
  title: string;
  message: string;
  memberName?: string;
  syncState?: SyncState;
  onDismiss?: () => void;
  testID?: string;
}

export function ScanResultOverlay(props: ScanResultOverlayProps): JSX.Element {
  return (
    <Modal animationType="fade" transparent visible={props.visible}>
      <View style={styles.scrim}>
        <View
          accessibilityLiveRegion="assertive"
          accessibilityRole={props.tone === "error" ? "alert" : "summary"}
          style={styles.card}
          testID={props.testID}
        >
          <Text
            style={[
              styles.symbol,
              props.tone === "success" && styles.success,
              props.tone === "warning" && styles.warning,
              props.tone === "error" && styles.error,
            ]}
          >
            {props.tone === "success" ? "✓" : "!"}
          </Text>
          <Text style={styles.title}>{props.title}</Text>
          {props.memberName ? <Text style={styles.member}>{props.memberName}</Text> : null}
          <Text style={styles.message}>{props.message}</Text>
          {props.syncState ? <SyncBadge state={props.syncState} /> : null}
          {props.onDismiss ? (
            <SecondaryButton
              fullWidth
              label="Return to Scanner"
              onPress={props.onDismiss}
              testID="dismiss-scan-result"
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.scrim,
  },
  card: {
    width: layout.fullWidth,
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderRadius: radii.md,
  },
  symbol: { ...typography.displayLarge },
  success: { color: colors.success },
  warning: { color: colors.warning },
  error: { color: colors.danger },
  title: { ...typography.headingLarge, color: colors.textPrimary, textAlign: "center" },
  member: { ...typography.headingSmall, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
});
