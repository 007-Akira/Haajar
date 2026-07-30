import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  GroupCard,
  LoadingSkeleton,
  PageHeader,
  ScreenContainer,
  SectionHeader,
} from "@/components";
import { colors, layout, spacing, typography } from "@/theme";

import { MainGroupCard } from "../components/main-group-card";
import { OrganiserActions } from "../components/organiser-actions";
import { TripSummaryCard } from "../components/trip-summary-card";
import { canShowOrganiserActions, getMockEventDetails } from "../data/mock-event-details";

export function TripDetailsScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId: string; state?: string }>();
  const [activityMessage, setActivityMessage] = useState("");
  const result = getMockEventDetails(params.eventId, params.state);
  const backAction = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "trip-details-back-button",
  };

  if (result.status === "loading") {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="trip-details-loading"
      >
        <PageHeader leadingAction={backAction} title="Trip details" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  if (result.status === "error") {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="trip-details-error">
        <PageHeader leadingAction={backAction} title="Trip details" />
        <EmptyState
          actionLabel="Go Back"
          description={result.message}
          onActionPress={() => router.back()}
          testID="trip-details-error-state"
          title="Trip unavailable"
        />
      </ScreenContainer>
    );
  }

  const { event } = result;

  function showMockMessage(message: string): void {
    setActivityMessage(message);
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="trip-details-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={event.dateOrStatus}
        testID="trip-details-header"
        title={event.name}
        trailingAction={{
          accessibilityLabel: "More trip actions",
          icon: (
            <Ionicons color={colors.textPrimary} name="ellipsis-vertical" size={layout.iconSize} />
          ),
          onPress: () => showMockMessage("More trip actions selected."),
          testID: "trip-overflow-button",
        }}
      />

      {activityMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.activityMessage}
          testID="trip-action-message"
        >
          {activityMessage}
        </Text>
      ) : null}

      <TripSummaryCard
        activeRollCallLabel={event.activeRollCallLabel}
        eventName={event.name}
        groupCount={event.groups.length}
        participantCount={event.participantCount}
        testID="trip-summary"
        userRole={event.userRole}
      />

      <View style={styles.section}>
        <SectionHeader description="The complete trip roster." title="Main Group" />
        <MainGroupCard
          onViewMembers={() => showMockMessage("Main Group members selected.")}
          onViewRollCalls={() => showMockMessage("Main Group roll calls selected.")}
          participantCount={event.participantCount}
          testID="main-group-card"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader description="Flexible groups belonging to this trip." title="Groups" />
        {event.groups.length > 0 ? (
          <View style={styles.groupList}>
            {event.groups.map((group) => (
              <GroupCard
                activeRollCall={group.activeRollCall}
                groupName={group.name}
                key={group.id}
                memberCount={group.memberCount}
                onPress={() =>
                  router.push({
                    pathname: "/events/[eventId]/groups/[groupId]",
                    params: { eventId: event.id, groupId: group.id },
                  })
                }
                testID={`group-card-${group.id}`}
                userRole={group.userRole}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            description="Internal groups created for this trip will appear here."
            testID="trip-groups-empty-state"
            title="No groups yet"
          />
        )}
      </View>

      {canShowOrganiserActions(event.userRole) ? (
        <OrganiserActions
          onAddGroup={() => showMockMessage("Add Group selected.")}
          onManageMembers={() => showMockMessage("Manage Members selected.")}
          onStartRollCall={() => showMockMessage("Start Roll Call selected.")}
          testID="organiser-actions"
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  activityMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  groupList: {
    gap: spacing.sm,
  },
});
