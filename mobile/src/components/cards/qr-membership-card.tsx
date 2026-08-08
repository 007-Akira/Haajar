import type { JSX, RefObject } from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { colors, layout, opacity, radii, shadows, spacing, typography } from "@/theme";

import { RoleBadge, type UserRole } from "../status/role-badge";

export type QRValidity = "valid" | "regenerated" | "revoked";

export interface QRMembershipCardProps {
  groupName: string;
  eventName: string;
  memberName: string;
  role: UserRole;
  membershipReference: string;
  validity: QRValidity;
  payload: string;
  qrCaptureRef?: RefObject<View | null>;
  testID?: string;
}

export function QRMembershipCard({
  groupName,
  eventName,
  memberName,
  role,
  membershipReference,
  validity,
  payload,
  qrCaptureRef,
  testID,
}: QRMembershipCardProps): JSX.Element {
  const isRevoked = validity === "revoked";

  return (
    <View
      accessibilityLabel={`${groupName} membership QR for ${memberName}, ${validity}`}
      style={[styles.card, isRevoked && styles.revokedCard]}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.eventName}>{eventName}</Text>
        </View>
        <View style={[styles.validity, isRevoked && styles.revokedValidity]}>
          <Text style={[styles.validityText, isRevoked && styles.revokedValidityText]}>
            {`[ ${validity.toUpperCase()} ]`}
          </Text>
        </View>
      </View>

      <View
        ref={qrCaptureRef}
        accessibilityLabel="Group membership QR credential"
        accessibilityRole="image"
        collapsable={false}
        style={styles.qrFrame}
      >
        <QRCode
          backgroundColor="#FFFFFF"
          color={colors.textPrimary}
          ecl="M"
          size={layout.qrPlaceholderSize - spacing.lg}
          value={payload}
        />
      </View>

      <View style={styles.memberDetails}>
        <Text style={styles.memberName}>{memberName}</Text>
        <RoleBadge role={role} />
        <Text style={styles.reference}>{`MEMBERSHIP REF: ${membershipReference}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.hardMedium,
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  revokedCard: {
    opacity: opacity.disabled,
    ...shadows.none,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.half,
  },
  groupName: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  eventName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  validity: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.half,
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderWidth: layout.borderWidth,
    borderRadius: radii.xs,
  },
  revokedValidity: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  validityText: {
    ...typography.badge,
    color: colors.textPrimary,
  },
  revokedValidityText: {
    color: colors.danger,
  },
  qrFrame: {
    width: layout.qrPlaceholderSize,
    height: layout.qrPlaceholderSize,
    alignSelf: "center",
    padding: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: layout.focusedBorderWidth,
    borderColor: colors.textPrimary,
  },
  memberDetails: {
    alignItems: "center",
    gap: spacing.xs,
  },
  memberName: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  reference: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
