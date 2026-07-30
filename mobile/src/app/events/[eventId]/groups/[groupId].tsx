import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";

import { EmptyState, PageHeader, ScreenContainer } from "@/components";
import { findMockGroup } from "@/features/events/data/mock-event-details";
import { colors, layout } from "@/theme";

export default function GroupPlaceholderRoute(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
  }>();
  const group = findMockGroup(eventId, groupId);

  return (
    <ScreenContainer testID="group-placeholder-route">
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to trip details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
          testID: "group-placeholder-back-button",
        }}
        title={group?.name ?? "Group"}
      />
      <EmptyState
        description="Group details will be implemented in a later static UI stage."
        title={group?.name ?? "Group"}
      />
    </ScreenContainer>
  );
}
