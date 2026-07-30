import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components";
import { colors, layout, radii, spacing, typography } from "@/theme";

export interface MainGroupCardProps {
  participantCount: number;
  onViewMembers: () => void;
  onViewRollCalls: () => void;
  testID?: string;
}

export function MainGroupCard({
  participantCount,
  onViewMembers,
  onViewRollCalls,
  testID,
}: MainGroupCardProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>[ MAIN GROUP ]</Text>
          <Text style={styles.title}>Everyone</Text>
          <Text style={styles.description}>All members belonging to this trip.</Text>
        </View>
        <View style={styles.count}>
          <Text style={styles.countValue}>{participantCount}</Text>
          <Text style={styles.countLabel}>MEMBERS</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.action}>
          <SecondaryButton
            fullWidth
            label="View Members"
            onPress={onViewMembers}
            testID="main-group-members-button"
          />
        </View>
        <View style={styles.action}>
          <SecondaryButton
            fullWidth
            label="View Roll Calls"
            onPress={onViewRollCalls}
            testID="main-group-roll-calls-button"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.surfaceElevated,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.half,
  },
  eyebrow: {
    ...typography.badge,
    color: colors.accent,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textInverse,
  },
  description: {
    ...typography.caption,
    color: colors.gridLine,
  },
  count: {
    alignItems: "flex-end",
  },
  countValue: {
    ...typography.headingLarge,
    color: colors.textInverse,
  },
  countLabel: {
    ...typography.technicalLabel,
    color: colors.gridLine,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
