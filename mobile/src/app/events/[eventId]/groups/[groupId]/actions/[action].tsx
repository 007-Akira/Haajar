import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";

import { EmptyState, PageHeader, ScreenContainer } from "@/components";
import { getGroupActionLabel } from "@/features/groups/config/group-action-config";
import { getMockGroupDetails } from "@/features/groups/data/mock-group-details";
import { colors, layout } from "@/theme";

export default function GroupActionPlaceholderRoute(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId, action } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    action: string;
  }>();
  const group = getMockGroupDetails(eventId, groupId);
  const actionLabel = getGroupActionLabel(action) ?? "Group action";

  return (
    <ScreenContainer showGrid testID={`group-action-placeholder-${action}`}>
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to group details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
          testID: "group-action-placeholder-back-button",
        }}
        subtitle={group ? `${group.eventName} · ${group.name}` : undefined}
        title={actionLabel}
      />
      <EmptyState
        description={`${actionLabel} will be implemented in a later attendance UI stage.`}
        testID="group-action-placeholder-state"
        title="Static navigation placeholder"
      />
    </ScreenContainer>
  );
}
