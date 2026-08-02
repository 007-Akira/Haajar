import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DashboardMemberStatus as AttendanceStatus } from "@/features/attendance/types/attendance-contracts";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { StatusBadge } from "../status/status-badge";
import { SecondaryButton } from "../actions/secondary-button";

export interface AttendanceMemberRowProps {
  name: string;
  phone: string;
  status: AttendanceStatus;
  markedAt?: string;
  markingMethod?: "qr" | "manual" | "offline_sync";
  markedBy?: string;
  sourceGroup?: string;
  onCall?: () => void;
  testID?: string;
}

export function AttendanceMemberRow({
  name,
  phone,
  status,
  markedAt,
  markingMethod,
  markedBy,
  sourceGroup,
  onCall,
  testID,
}: AttendanceMemberRowProps): JSX.Element {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{phone}</Text>
        {sourceGroup ? <Text style={styles.meta}>{`Subgroup: ${sourceGroup}`}</Text> : null}
        {markedAt ? <Text style={styles.meta}>{`Marked ${markedAt}`}</Text> : null}
        {markingMethod ? (
          <Text
            style={styles.meta}
          >{`Method: ${markingMethod === "qr" ? "QR ticket" : markingMethod === "offline_sync" ? "Offline scan" : "Manual"}`}</Text>
        ) : null}
        {markedBy ? <Text style={styles.meta}>{`Marked by ${markedBy}`}</Text> : null}
      </View>
      {status === "unmarked" ? (
        <Text style={styles.unmarked}>[ UNMARKED ]</Text>
      ) : (
        <StatusBadge status={status} />
      )}
      {onCall ? (
        <View style={styles.callAction}>
          <SecondaryButton label="Call" onPress={onCall} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  copy: { flex: 1, gap: spacing.half },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  unmarked: { ...typography.badge, color: colors.textSecondary },
  callAction: { minWidth: layout.minimumTouchTarget },
});
