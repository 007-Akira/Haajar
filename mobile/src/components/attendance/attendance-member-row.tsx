import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DashboardMemberStatus as AttendanceStatus } from "@/features/attendance/types/attendance-contracts";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { StatusBadge } from "../status/status-badge";

export interface AttendanceMemberRowProps {
  name: string;
  phone: string;
  status: AttendanceStatus;
  markedAt?: string;
  markingMethod?: "qr" | "manual";
  markedBy?: string;
  testID?: string;
}

export function AttendanceMemberRow({
  name,
  phone,
  status,
  markedAt,
  markingMethod,
  markedBy,
  testID,
}: AttendanceMemberRowProps): JSX.Element {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{phone}</Text>
        {markedAt ? <Text style={styles.meta}>{`Marked ${markedAt}`}</Text> : null}
        {markingMethod ? (
          <Text
            style={styles.meta}
          >{`Method: ${markingMethod === "qr" ? "QR ticket" : "Manual"}`}</Text>
        ) : null}
        {markedBy ? <Text style={styles.meta}>{`Marked by ${markedBy}`}</Text> : null}
      </View>
      {status === "unmarked" ? (
        <Text style={styles.unmarked}>[ UNMARKED ]</Text>
      ) : (
        <StatusBadge status={status} />
      )}
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
});
