import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

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
  testID?: string;
}

function seedValue(seed: string): number {
  return Array.from(seed).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    7
  );
}

function isFinderPixel(row: number, column: number): boolean {
  const dimension = layout.qrGridDimension;
  const finderOrigins = [
    [0, 0],
    [0, dimension - 7],
    [dimension - 7, 0],
  ];

  return finderOrigins.some(([originRow, originColumn]) => {
    const localRow = row - originRow;
    const localColumn = column - originColumn;
    const inside = localRow >= 0 && localRow < 7 && localColumn >= 0 && localColumn < 7;
    const outer = localRow === 0 || localRow === 6 || localColumn === 0 || localColumn === 6;
    const inner = localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4;
    return inside && (outer || inner);
  });
}

function createPlaceholderMatrix(seed: string): boolean[] {
  const dimension = layout.qrGridDimension;
  const base = seedValue(seed);

  return Array.from({ length: dimension * dimension }, (_, index) => {
    const row = Math.floor(index / dimension);
    const column = index % dimension;

    if (isFinderPixel(row, column)) {
      return true;
    }

    return (base + row * 17 + column * 29 + row * column * 3) % 7 < 3;
  });
}

export function QRMembershipCard({
  groupName,
  eventName,
  memberName,
  role,
  membershipReference,
  validity,
  testID,
}: QRMembershipCardProps): JSX.Element {
  const matrix = createPlaceholderMatrix(`${eventName}:${groupName}:${membershipReference}`);
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
        accessibilityLabel="Visual QR placeholder"
        accessibilityRole="image"
        style={styles.qrFrame}
      >
        <View style={styles.qrGrid}>
          {matrix.map((filled, index) => (
            <View
              key={index}
              style={[
                styles.qrCell,
                filled && (isRevoked ? styles.revokedCell : styles.filledCell),
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.memberDetails}>
        <Text style={styles.memberName}>{memberName}</Text>
        <RoleBadge role={role} />
        <Text style={styles.reference}>{`MEMBERSHIP REF: ${membershipReference}`}</Text>
      </View>
    </View>
  );
}

const cellWidth = `${100 / layout.qrGridDimension}%` as const;

const styles = StyleSheet.create({
  card: {
    ...shadows.hardMedium,
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.focusedBorderWidth,
  },
  qrGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  qrCell: {
    width: cellWidth,
    aspectRatio: 1,
    backgroundColor: colors.surface,
  },
  filledCell: {
    backgroundColor: colors.textPrimary,
  },
  revokedCell: {
    backgroundColor: colors.danger,
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
