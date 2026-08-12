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
  totalRoster: number;
  presentCount: number;
  remainingCount: number;
}

export interface GroupPrimaryActionsProps {
  role: UserRole;
  activeRollCall?: ActiveGroupRollCall;
  groupKind?: "category" | "operational";
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

const operationalAttendanceActions = new Set<GroupActionId>([
  "scan-qr",
  "manual-attendance",
  "active-roll-call",
  "absentees",
  "offline-roster",
]);

function withoutOperationalAttendance(actions: GroupActionDefinition[]): GroupActionDefinition[] {
  return actions.filter((action) => !operationalAttendanceActions.has(action.id));
}

export function GroupPrimaryActions({
  role,
  activeRollCall,
  groupKind = "operational",
  onActionPress,
  testID,
}: GroupPrimaryActionsProps): JSX.Element {
  const configuredSections = getGroupActionSections(role, Boolean(activeRollCall));
  const sections =
    groupKind === "category" && role === "super organiser"
      ? {
          primary: {
            id: activeRollCall ? ("active-roll-call" as const) : ("start-roll-call" as const),
            label: activeRollCall ? "OPEN CATEGORY ATTENDANCE" : "START CATEGORY ATTENDANCE",
          },
          priority: [],
          more: [
            { id: "attendance-history" as const, label: "Attendance History" },
            { id: "export-attendance" as const, label: "Export Attendance" },
          ],
          showsRollCallState: true,
        }
      : groupKind === "category"
        ? {
            ...configuredSections,
            primary: { id: "view-members" as const, label: "View Members" },
            priority: [],
            more: withoutOperationalAttendance(configuredSections.more).filter(
              (action) => action.id !== "view-members" && action.id !== "attendance-history"
            ),
            showsRollCallState: false,
          }
        : role === "organiser" || role === "super organiser"
          ? {
              ...configuredSections,
              primary: {
                id: activeRollCall ? ("active-roll-call" as const) : ("start-roll-call" as const),
                label: activeRollCall ? "OPEN SUBGROUP ATTENDANCE" : "START SUBGROUP ATTENDANCE",
              },
              showsRollCallState: true,
            }
          : configuredSections;

  return (
    <View style={styles.container} testID={testID}>
      <SectionHeader
        description={
          sections.showsRollCallState
            ? "Start attendance when you're ready to begin roll call for this group."
            : "Available actions for your role in this group."
        }
        title={sections.showsRollCallState ? "Attendance" : "Group actions"}
      />

      {sections.showsRollCallState ? (
        activeRollCall ? (
          <View
            accessibilityLabel={`${activeRollCall.totalRoster} total, ${activeRollCall.presentCount} present, ${activeRollCall.remainingCount} remaining`}
            style={styles.rollCallState}
            testID="active-roll-call-state"
          >
            <Text style={styles.attendanceStatus}>Attendance active</Text>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{activeRollCall.totalRoster}</Text>
              <Text style={styles.metricLabel}>TOTAL</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{activeRollCall.presentCount}</Text>
              <Text style={styles.metricLabel}>PRESENT</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{activeRollCall.remainingCount}</Text>
              <Text style={styles.metricLabel}>REMAINING</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noActiveMessage} testID="no-active-attendance-state">
            <Text style={styles.attendanceStatus}>No active attendance</Text>
            <Text style={styles.attendanceHelp}>
              Start attendance when you are ready to begin roll call for this{" "}
              {groupKind === "category" ? "category" : "subgroup"}.
            </Text>
          </View>
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
    flexWrap: "wrap",
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
  attendanceStatus: { ...typography.bodyMedium, color: colors.textPrimary, width: "100%" },
  attendanceHelp: { ...typography.body, color: colors.textSecondary },
  metricValue: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  noActiveMessage: {
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
