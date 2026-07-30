import { Ionicons } from "@expo/vector-icons";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radii, spacing, typography } from "@/theme";

import { IconButton } from "../actions/icon-button";
import { RoleBadge, type UserRole } from "../status/role-badge";

export interface MemberRowProps {
  name: string;
  phone: string;
  internalGroupCount: number;
  role?: UserRole;
  onCall: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function MemberRow({
  name,
  phone,
  internalGroupCount,
  role,
  onCall,
  accessibilityLabel,
  testID,
}: MemberRowProps): JSX.Element {
  return (
    <View
      accessibilityLabel={
        accessibilityLabel ??
        `${name}, ${phone}, ${internalGroupCount} internal groups${role ? `, ${role}` : ""}`
      }
      style={styles.container}
      testID={testID}
    >
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.phone}>{phone}</Text>
        <Text style={styles.groupCount}>
          {`${internalGroupCount} INTERNAL ${internalGroupCount === 1 ? "GROUP" : "GROUPS"}`}
        </Text>
        {role ? <RoleBadge role={role} /> : null}
      </View>
      <IconButton
        accessibilityLabel={`Call ${name}`}
        icon={<Ionicons color={colors.textPrimary} name="call-outline" size={layout.iconSize} />}
        onPress={onCall}
        testID={testID ? `${testID}-call` : undefined}
      />
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
});
