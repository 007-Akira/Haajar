import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
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
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, spacing, typography } from "@/theme";

import { MainGroupCard } from "../components/main-group-card";
import { OrganiserActions } from "../components/organiser-actions";
import { TripSummaryCard } from "../components/trip-summary-card";
import { useEvent } from "../hooks/use-event";
import { useEventGroups } from "../hooks/use-event-groups";
import { useEventMemberCount } from "../hooks/use-event-member-count";
import { useEventMembership } from "../hooks/use-event-membership";
import {
  canManageEvent,
  toEventDisplayRole,
  toGroupDisplayRole,
} from "../permissions/event-permissions";

export function TripDetailsScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventQuery = useEvent(params.eventId);
  const membershipQuery = useEventMembership(params.eventId);
  const groupsQuery = useEventGroups(params.eventId);
  const memberCountQuery = useEventMemberCount(params.eventId);
  const backAction = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "trip-details-back-button",
  };

  const isInitialLoading =
    eventQuery.isLoading ||
    membershipQuery.isLoading ||
    membershipQuery.sessionLoading ||
    (membershipQuery.data?.status === "active" &&
      (groupsQuery.isLoading || memberCountQuery.isLoading));

  if (isInitialLoading) {
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

  const failedQuery = [eventQuery, membershipQuery, groupsQuery, memberCountQuery].find(
    (query) => query.isError
  );

  if (failedQuery) {
    const description = isAppError(failedQuery.error)
      ? failedQuery.error.message
      : userSafeErrorMessages.UNKNOWN_ERROR;
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="trip-details-error">
        <PageHeader leadingAction={backAction} title="Trip details" />
        <EmptyState
          actionLabel="Retry"
          description={description}
          onActionPress={() => {
            void eventQuery.refetch();
            void membershipQuery.refetch();
            void groupsQuery.refetch();
            void memberCountQuery.refetch();
          }}
          testID="trip-details-error-state"
          title="Could not load trip"
        />
      </ScreenContainer>
    );
  }

  if (membershipQuery.sessionMissing || !membershipQuery.data) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="trip-unauthorised">
        <PageHeader leadingAction={backAction} title="Trip details" />
        <EmptyState
          actionLabel="Go Back"
          description="You need an active membership to view this trip."
          onActionPress={() => router.back()}
          testID="trip-unauthorised-state"
          title="Access unavailable"
        />
      </ScreenContainer>
    );
  }

  if (membershipQuery.data.status !== "active") {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="trip-unauthorised">
        <PageHeader leadingAction={backAction} title="Trip details" />
        <EmptyState
          actionLabel="Go Back"
          description="Your membership for this trip is not active."
          onActionPress={() => router.back()}
          testID="trip-unauthorised-state"
          title="Access unavailable"
        />
      </ScreenContainer>
    );
  }

  if (!eventQuery.data) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="trip-missing">
        <PageHeader leadingAction={backAction} title="Trip details" />
        <EmptyState
          actionLabel="Go Back"
          description="This trip no longer exists."
          onActionPress={() => router.back()}
          testID="trip-missing-state"
          title="Trip not found"
        />
      </ScreenContainer>
    );
  }

  const event = eventQuery.data;
  const groups = groupsQuery.data ?? [];
  const categoryGroups = groups.filter((group) => group.groupKind === "category");
  const legacyOperationalGroups = groups.filter(
    (group) => group.groupKind === "operational" && !group.parentGroupId
  );
  const userRole = toEventDisplayRole(membershipQuery.data.role);
  const isRefreshing = [eventQuery, membershipQuery, groupsQuery, memberCountQuery].some(
    (query) => query.isRefetching
  );

  function refresh(): void {
    void Promise.all([
      eventQuery.refetch(),
      membershipQuery.refetch(),
      groupsQuery.refetch(),
      memberCountQuery.refetch(),
    ]);
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={refresh}
      refreshing={isRefreshing}
      scroll
      showGrid
      testID="trip-details-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={event.status === "archived" ? "Archived trip" : "Active trip"}
        testID="trip-details-header"
        title={event.name}
      />

      {event.status === "archived" ? (
        <View accessibilityRole="alert" style={styles.archivedNotice} testID="trip-archived-notice">
          <Text style={styles.archivedTitle}>[ ARCHIVED TRIP ]</Text>
          <Text style={styles.archivedDescription}>
            This trip is read-only while it is archived.
          </Text>
        </View>
      ) : null}

      <TripSummaryCard
        description={event.description}
        eventName={event.name}
        groupCount={groups.length}
        participantCount={memberCountQuery.data ?? 0}
        status={event.status === "archived" ? "archived" : "active"}
        testID="trip-summary"
        userRole={userRole}
      />

      <View style={styles.section}>
        <SectionHeader description="The complete trip roster." title="Main Group" />
        <MainGroupCard
          onViewMembers={() =>
            router.push({
              pathname: "/events/[eventId]/members",
              params: { eventId: event.id },
            })
          }
          participantCount={memberCountQuery.data ?? 0}
          testID="main-group-card"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader description="Flexible groups belonging to this trip." title="Groups" />
        {groupsQuery.isLoading || memberCountQuery.isLoading ? (
          <LoadingSkeleton lines={layout.skeletonDefaultLines} testID="trip-groups-loading" />
        ) : groups.length > 0 ? (
          <View style={styles.groupList}>
            {[...categoryGroups, ...legacyOperationalGroups].map((group) => {
              const children = groups.filter((child) => child.parentGroupId === group.id);
              return (
                <View key={group.id} style={styles.hierarchyBranch}>
                  <Text style={styles.hierarchyLabel}>
                    {group.groupKind === "category" ? "[ CATEGORY ]" : "[ LEGACY GROUP ]"}
                  </Text>
                  <GroupCard
                    groupName={group.name}
                    memberCount={
                      group.groupKind === "category"
                        ? children.reduce((total, child) => total + child.activeMemberCount, 0)
                        : group.activeMemberCount
                    }
                    onPress={() =>
                      router.push({
                        pathname: "/events/[eventId]/groups/[groupId]",
                        params: { eventId: event.id, groupId: group.id },
                      })
                    }
                    testID={`group-card-${group.id}`}
                    userRole={toGroupDisplayRole(group.currentRole)}
                  />
                  {children.length > 0 ? (
                    <View style={styles.childGroups}>
                      {children.map((child) => (
                        <GroupCard
                          groupName={child.name}
                          key={child.id}
                          memberCount={child.activeMemberCount}
                          onPress={() =>
                            router.push({
                              pathname: "/events/[eventId]/groups/[groupId]",
                              params: { eventId: event.id, groupId: child.id },
                            })
                          }
                          testID={`group-card-${child.id}`}
                          userRole={toGroupDisplayRole(child.currentRole)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            description="Internal groups created for this trip will appear here."
            testID="trip-groups-empty-state"
            title="No groups yet"
          />
        )}
      </View>

      {event.status === "active" && canManageEvent(membershipQuery.data.role) ? (
        <OrganiserActions
          onAddGroup={() => router.push(`/events/${event.id}/create-group` as Href)}
          onManageMembers={() =>
            router.push({
              pathname: "/events/[eventId]/members",
              params: { eventId: event.id },
            })
          }
          onStartGeneralAttendance={() =>
            router.push(`/events/${event.id}/attendance/general/create` as Href)
          }
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
  section: {
    gap: spacing.sm,
  },
  groupList: {
    gap: spacing.sm,
  },
  hierarchyBranch: { gap: spacing.xs },
  hierarchyLabel: { ...typography.technicalLabel, color: colors.textSecondary },
  childGroups: {
    gap: spacing.xs,
    paddingLeft: spacing.md,
    borderLeftColor: colors.border,
    borderLeftWidth: layout.borderWidth,
  },
  archivedNotice: {
    gap: spacing.half,
    padding: spacing.md,
    backgroundColor: colors.gridLine,
  },
  archivedTitle: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  archivedDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
