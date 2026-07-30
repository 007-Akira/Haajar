import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, SecondaryButton, SectionHeader, type UserRole } from "@/components";
import { colors, layout, radii, spacing, typography } from "@/theme";

import {
  getGroupActionSections,
  type GroupActionDefinition,
  type GroupActionId,
} from "../config/group-action-config";

export interface ActiveGroupRollCall {
  presentCount: number;
  pendingSyncCount: number;
}

export interface GroupPrimaryActionsProps {
  role: UserRole;
  activeRollCall?: ActiveGroupRollCall;
  onActionPress: (actionId: GroupActionId) => void;
  testID?: string;
}

function pairActions(actions: GroupActionDefinition[]): GroupActionDefinition[][] {
  const pairs: GroupActionDefinition[][] = [];

  for (let index = 0; index < actions.length; index += 2) {
    pairs.push(actions.slice(index, index + 2));
  }

  return pairs;
}

export function GroupPrimaryActions({
  role,
  activeRollCall,
  onActionPress,
  testID,
}: GroupPrimaryActionsProps): JSX.Element {
  const sections = getGroupActionSections(role, Boolean(activeRollCall));

  return (
    <View style={styles.container} testID={testID}>
      <SectionHeader
        description="Available actions for your role in this group."
        title="Group actions"
      />

      {sections.showsRollCallState ? (
        activeRollCall ? (
          <View
            accessibilityLabel={`${activeRollCall.presentCount} present, ${activeRollCall.pendingSyncCount} pending sync`}
            style={styles.rollCallState}
            testID="active-roll-call-state"
          >
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{activeRollCall.presentCount}</Text>
              <Text style={styles.metricLabel}>PRESENT</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{activeRollCall.pendingSyncCount}</Text>
              <Text style={styles.metricLabel}>PENDING SYNC</Text>
            </View>
          </View>
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.noActiveMessage}
            testID="no-active-roll-call-message"
          >
            No active roll call
          </Text>
        )
      ) : null}

      <PrimaryButton
        fullWidth
        label={sections.primary.label}
        onPress={() => onActionPress(sections.primary.id)}
        testID={`group-action-${sections.primary.id}`}
      />

      {sections.priority.length > 0 ? (
        <View style={styles.priorityRow}>
          {sections.priority.map((action) => (
            <View key={action.id} style={styles.actionItem}>
              <SecondaryButton
                fullWidth
                label={action.label}
                onPress={() => onActionPress(action.id)}
                testID={`group-action-${action.id}`}
              />
            </View>
          ))}
        </View>
      ) : null}

      {sections.more.length > 0 ? (
        <View style={styles.moreSection}>
          <Text style={styles.moreLabel}>[ MORE ACTIONS ]</Text>
          {pairActions(sections.more).map((pair) => (
            <View key={pair.map((action) => action.id).join("-")} style={styles.actionRow}>
              {pair.map((action) => (
                <View key={action.id} style={styles.actionItem}>
                  <SecondaryButton
                    fullWidth
                    label={action.label}
                    onPress={() => onActionPress(action.id)}
                    testID={`group-action-${action.id}`}
                  />
                </View>
              ))}
              {pair.length === 1 ? <View style={styles.actionItem} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  rollCallState: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.half,
  },
  metricValue: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  noActiveMessage: {
    ...typography.bodyMedium,
    padding: spacing.md,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  moreSection: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  moreLabel: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionItem: {
    flex: 1,
  },
});
