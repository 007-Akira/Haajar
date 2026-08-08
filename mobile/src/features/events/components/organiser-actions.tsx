import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { PrimaryButton, SecondaryButton, SectionHeader } from "@/components";
import { spacing } from "@/theme";

export interface OrganiserActionsProps {
  onAddGroup: () => void;
  onManageMembers: () => void;
  onStartGeneralAttendance?: () => void;
  testID?: string;
}

export function OrganiserActions({
  onAddGroup,
  onManageMembers,
  onStartGeneralAttendance,
  testID,
}: OrganiserActionsProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <SectionHeader
        description="Administrative controls for this trip."
        title="Organiser actions"
      />
      <View style={styles.secondaryActions}>
        {onStartGeneralAttendance ? (
          <View style={styles.action}>
            <PrimaryButton
              fullWidth
              inkLabel
              label="Start General Attendance"
              onPress={onStartGeneralAttendance}
              testID="start-general-attendance-button"
            />
          </View>
        ) : null}
        <View style={styles.action}>
          <SecondaryButton
            fullWidth
            label="Add Group"
            onPress={onAddGroup}
            testID="add-group-button"
          />
        </View>
        <View style={styles.action}>
          <SecondaryButton
            fullWidth
            label="Manage Members"
            onPress={onManageMembers}
            testID="manage-members-button"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  secondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  action: {
    flexGrow: 1,
    flexBasis: "46%",
  },
});
