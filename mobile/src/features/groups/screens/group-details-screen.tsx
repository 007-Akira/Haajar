import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  MemberRow,
  PageHeader,
  RoleBadge,
  ScreenContainer,
  SectionHeader,
  StatusBadge,
} from "@/components";
import { toGroupDisplayRole } from "@/features/events/permissions/event-permissions";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { GroupPrimaryActions } from "../components/group-primary-actions";
import type { GroupActionId } from "../config/group-action-config";
import { useGroup } from "../hooks/use-group";
import { useGroupMembers } from "../hooks/use-group-members";
import { useGroupMembership } from "../hooks/use-group-membership";

export function GroupDetailsScreen(): JSX.Element {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const [activityMessage, setActivityMessage] = useState("");
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const membersQuery = useGroupMembers(groupId);
  const backAction = {
    accessibilityLabel: "Go back to trip details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "group-details-back-button",
  };
  const isInitialLoading =
    groupQuery.isLoading ||
    membershipQuery.isLoading ||
    membershipQuery.sessionLoading ||
    (membershipQuery.data?.status === "active" && membersQuery.isLoading);

  if (isInitialLoading) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="group-details-loading"
      >
        <PageHeader leadingAction={backAction} title="Group" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  const failedQuery = [groupQuery, membershipQuery, membersQuery].find((query) => query.isError);
  if (failedQuery) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="group-details-error">
        <PageHeader leadingAction={backAction} title="Group" />
        <EmptyState
          actionLabel="Retry"
          description={
            isAppError(failedQuery.error)
              ? failedQuery.error.message
              : userSafeErrorMessages.UNKNOWN_ERROR
          }
          onActionPress={() => {
            void groupQuery.refetch();
            void membershipQuery.refetch();
            void membersQuery.refetch();
          }}
          testID="group-details-error-state"
          title="Could not load group"
        />
      </ScreenContainer>
    );
  }

  if (
    membershipQuery.sessionMissing ||
    !membershipQuery.data ||
    membershipQuery.data.status !== "active"
  ) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        showGrid
        testID="group-details-unauthorised"
      >
        <PageHeader leadingAction={backAction} title="Group" />
        <EmptyState
          actionLabel="Go Back"
          description="You need an active membership to view this group."
          onActionPress={() => router.back()}
          testID="group-details-unauthorised-state"
          title="Not a group member"
        />
      </ScreenContainer>
    );
  }

  if (!groupQuery.data) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        showGrid
        testID="group-details-missing"
      >
        <PageHeader leadingAction={backAction} title="Group" />
        <EmptyState
          actionLabel="Go Back"
          description="This group no longer exists."
          onActionPress={() => router.back()}
          testID="group-details-missing-state"
          title="Group not found"
        />
      </ScreenContainer>
    );
  }

  const group = groupQuery.data;
  const members = membersQuery.data ?? [];
  const userRole = toGroupDisplayRole(membershipQuery.data.role);
  const isArchived = group.status === "archived";
  const groupRouteParams = { eventId: group.eventId, groupId: group.id };
  const isRefreshing = [groupQuery, membershipQuery, membersQuery].some(
    (query) => query.isRefetching
  );

  function refresh(): void {
    void Promise.all([groupQuery.refetch(), membershipQuery.refetch(), membersQuery.refetch()]);
  }

  function showPrototypeMessage(message: string): void {
    setActivityMessage(message);
  }

  function handleGroupAction(actionId: GroupActionId): void {
    if (actionId === "show-my-qr") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/qr",
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "start-roll-call") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/roll-calls/create",
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "active-roll-call" || actionId === "scan-qr") {
      const rollCallParams = { ...groupRouteParams, rollCallId: "morning-assembly" };
      router.push({
        pathname:
          actionId === "scan-qr"
            ? "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/scanner"
            : "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
        params: rollCallParams,
      });
      return;
    }

    router.push({
      pathname: "/events/[eventId]/groups/[groupId]/actions/[action]",
      params: { ...groupRouteParams, action: actionId },
    });
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={refresh}
      refreshing={isRefreshing}
      scroll
      showGrid
      testID="group-details-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={group.eventName ?? "Trip"}
        testID="group-details-header"
        title={group.name}
      />

      {isArchived ? (
        <View accessibilityRole="alert" style={styles.archivedNotice} testID="group-archived-state">
          <Text style={styles.archivedTitle}>[ ARCHIVED GROUP ]</Text>
          <Text style={styles.archivedDescription}>
            Group actions are unavailable while this group is archived.
          </Text>
        </View>
      ) : null}

      <View style={styles.summary} testID="group-summary">
        <View style={styles.summaryHeader}>
          <View style={styles.summaryCopy}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
          </View>
          <RoleBadge role={userRole} />
        </View>
        <View style={styles.summaryMetadata}>
          <StatusBadge status={isArchived ? "archived" : "active"} />
          <Text style={styles.memberCount}>{`${members.length} ACTIVE MEMBERS`}</Text>
          <Text style={styles.membershipStatus}>[ MEMBERSHIP ACTIVE ]</Text>
        </View>
      </View>

      {!isArchived ? (
        <>
          <View style={styles.prototypeNotice} testID="group-actions-prototype-notice">
            <Text style={styles.prototypeTitle}>[ PROTOTYPE ACTIONS ]</Text>
            <Text style={styles.prototypeDescription}>
              Attendance, QR, join-request, offline, and export actions still use mock data.
            </Text>
          </View>
          <GroupPrimaryActions
            onActionPress={handleGroupAction}
            role={userRole}
            testID="group-primary-actions"
          />
        </>
      ) : null}

      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
          {activityMessage}
        </Text>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          description={`${members.length} active members belong to this group.`}
          title="Members"
        />
        {members.length > 0 ? (
          <View style={styles.list}>
            {members.map((member) => {
              const memberName = member.profile?.full_name?.trim() || "Unnamed member";
              return (
                <MemberRow
                  key={member.membershipId}
                  name={memberName}
                  onCall={() => showPrototypeMessage(`Call action selected for ${memberName}.`)}
                  phone={member.profile?.phone ?? "Phone unavailable"}
                  role={toGroupDisplayRole(member.role)}
                  testID={`group-member-${member.membershipId}`}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            description="Active members added to this group will appear here."
            testID="group-members-empty"
            title="No active members"
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  summary: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.half,
  },
  summaryMetadata: {
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  groupName: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  memberCount: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  membershipStatus: {
    ...typography.technicalLabel,
    color: colors.success,
  },
  activityMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
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
  prototypeNotice: {
    gap: spacing.half,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  prototypeTitle: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  prototypeDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
