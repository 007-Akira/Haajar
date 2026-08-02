import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { SecondaryButton, SectionHeader } from "@/components";
import { spacing } from "@/theme";

export interface OrganiserActionsProps {
  onAddGroup: () => void;
  onManageMembers: () => void;
  testID?: string;
}

export function OrganiserActions({
  onAddGroup,
  onManageMembers,
  testID,
}: OrganiserActionsProps): JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <SectionHeader
        description="Administrative controls for this trip."
        title="Organiser actions"
      />
      <View style={styles.secondaryActions}>
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
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
