import { Ionicons } from "@expo/vector-icons";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import { IconButton } from "../actions/icon-button";
import { InitialsBadge } from "../status/initials-badge";
import { RoleBadge, type UserRole } from "../status/role-badge";

export interface MemberRowProps {
  name: string;
  phone: string;
  internalGroupCount?: number;
  role?: UserRole;
  statusLabel?: string;
  onCall: () => void;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function MemberRow({
  name,
  phone,
  internalGroupCount,
  role,
  statusLabel,
  onCall,
  onPress,
  accessibilityLabel,
  testID,
}: MemberRowProps): JSX.Element {
  return (
    <View
      accessibilityLabel={
        accessibilityLabel ??
        `${name}, ${phone}${internalGroupCount !== undefined ? `, ${internalGroupCount} internal groups` : ""}${role ? `, ${role}` : ""}`
      }
      style={styles.container}
      testID={testID}
    >
      <InitialsBadge name={name} />
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.phone}>{phone}</Text>
        {internalGroupCount !== undefined ? (
          <Text style={styles.groupCount}>
            {`${internalGroupCount} INTERNAL ${internalGroupCount === 1 ? "GROUP" : "GROUPS"}`}
          </Text>
        ) : null}
        {role ? <RoleBadge role={role} /> : null}
        {statusLabel ? (
          <Text style={styles.status}>{`[ ${statusLabel.toUpperCase()} ]`}</Text>
        ) : null}
      </View>
      <IconButton
        accessibilityLabel={`Call ${name}`}
        icon={<Ionicons color={colors.textPrimary} name="call-outline" size={layout.iconSize} />}
        onPress={onCall}
        testID={testID ? `${testID}-call` : undefined}
      />
      {onPress ? (
        <IconButton
          accessibilityLabel={`Open ${name} details`}
          icon={
            <Ionicons color={colors.textPrimary} name="chevron-forward" size={layout.iconSize} />
          }
          onPress={onPress}
          testID={testID ? `${testID}-open` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  copy: {
    flex: 1,
    alignItems: "flex-start",
    gap: spacing.half,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  phone: {
    ...typography.body,
    color: colors.textSecondary,
  },
  groupCount: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  status: {
    ...typography.technicalLabel,
    color: colors.success,
  },
});
