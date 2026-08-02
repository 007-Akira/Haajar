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
  SecondaryButton,
  SectionHeader,
  StatusBadge,
  TextField,
  type UserRole,
} from "@/components";
import { toGroupDisplayRole } from "@/features/events/permissions/event-permissions";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { openPhoneLink } from "@/lib/native/open-phone-link";
import { usePendingGroupRequests } from "@/features/join-requests/hooks/use-join-requests";
import { useActiveRollCall } from "@/features/attendance/hooks/use-active-roll-call";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { GroupPrimaryActions } from "../components/group-primary-actions";
import type { GroupActionId } from "../config/group-action-config";
import { useGroup } from "../hooks/use-group";
import { useGroupMembers } from "../hooks/use-group-members";
import { useGroupMembership } from "../hooks/use-group-membership";

type RoleFilter = "all" | UserRole;

const roleFilters: RoleFilter[] = ["all", "member", "co-organiser", "organiser", "super organiser"];

export function GroupDetailsScreen(): JSX.Element {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const [activityMessage, setActivityMessage] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const membersQuery = useGroupMembers(groupId);
  const activeRollCallQuery = useActiveRollCall(groupId);
  const canManageRequests =
    membershipQuery.data?.status === "active" &&
    (membershipQuery.data.role === "organiser" || membershipQuery.data.role === "super_organiser");
  const pendingRequestsQuery = usePendingGroupRequests(groupId, canManageRequests);
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
    activeRollCallQuery.isLoading ||
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

  const failedQuery = [groupQuery, membershipQuery, membersQuery, activeRollCallQuery].find(
    (query) => query.isError
  );
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
            void activeRollCallQuery.refetch();
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
  const normalizedMemberQuery = memberQuery.trim().toLowerCase();
  const filteredMembers = members.filter((member) => {
    const name = member.profile?.full_name ?? "";
    const phone = member.profile?.phone ?? "";
    const role = toGroupDisplayRole(member.role);
    return (
      (!normalizedMemberQuery ||
        name.toLowerCase().includes(normalizedMemberQuery) ||
        phone.toLowerCase().includes(normalizedMemberQuery)) &&
      (roleFilter === "all" || role === roleFilter)
    );
  });
  const userRole = toGroupDisplayRole(membershipQuery.data.role);
  const isArchived = group.status === "archived";
  const groupRouteParams = { eventId: group.eventId, groupId: group.id };
  const isRefreshing = [groupQuery, membershipQuery, membersQuery, activeRollCallQuery].some(
    (query) => query.isRefetching
  );

  function refresh(): void {
    void Promise.all([
      groupQuery.refetch(),
      membershipQuery.refetch(),
      membersQuery.refetch(),
      activeRollCallQuery.refetch(),
    ]);
  }

  function cycleRoleFilter(): void {
    const currentIndex = roleFilters.indexOf(roleFilter);
    setRoleFilter(roleFilters[(currentIndex + 1) % roleFilters.length] ?? "all");
  }

  async function callMember(name: string, phone: string | null): Promise<void> {
    try {
      const opened = await openPhoneLink(phone);
      if (!opened) setActivityMessage(`No phone number is available for ${name}.`);
    } catch {
      setActivityMessage(`Could not open the phone app for ${name}.`);
    }
  }

  function handleGroupAction(actionId: GroupActionId): void {
    if (actionId === "show-my-qr") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/qr",
        params: groupRouteParams,
      });
      return;
    }

    if (
      actionId === "view-members" ||
      actionId === "manage-members" ||
      actionId === "assign-roles"
    ) {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/members" as never,
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

    if (actionId === "attendance-history") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/roll-calls",
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "registration-form") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/registration-form" as never,
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "join-requests") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/join-requests" as never,
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "share-invitation") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/invite" as never,
        params: groupRouteParams,
      });
      return;
    }

    if (
      actionId === "active-roll-call" ||
      actionId === "scan-qr" ||
      actionId === "manual-attendance" ||
      actionId === "absentees" ||
      actionId === "offline-roster"
    ) {
      const activeRollCall = activeRollCallQuery.data;
      if (!activeRollCall) {
        setActivityMessage("No active roll call is available for this action.");
        return;
      }
      const rollCallParams = { ...groupRouteParams, rollCallId: activeRollCall.id };
      router.push({
        pathname:
          actionId === "scan-qr"
            ? "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/scanner"
            : actionId === "manual-attendance"
              ? "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/manual"
              : "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
        params: rollCallParams,
      });
      return;
    }

    if (actionId === "export-attendance") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/roll-calls",
        params: groupRouteParams,
      });
    }
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

      <View style={styles.ticketPreview} testID="membership-ticket-preview">
        <View style={styles.ticketCopy}>
          <Text style={styles.prototypeTitle}>YOUR MEMBERSHIP TICKET</Text>
          <Text style={styles.description}>{group.eventName ?? "Trip"}</Text>
          <Text
            style={styles.memberCount}
          >{`REF ${membershipQuery.data.id.slice(0, 8).toUpperCase()}`}</Text>
        </View>
        <SecondaryButton
          accessibilityLabel="Open your membership QR"
          label="Show QR"
          onPress={() => handleGroupAction("show-my-qr")}
          testID="membership-ticket-open-qr"
        />
      </View>

      {canManageRequests && (pendingRequestsQuery.data?.length ?? 0) > 0 ? (
        <View style={styles.requestNotice} testID="pending-request-count">
          <Text style={styles.prototypeTitle}>REQUESTS NEED REVIEW</Text>
          <Text
            style={styles.description}
          >{`${pendingRequestsQuery.data!.length} pending application${pendingRequestsQuery.data!.length === 1 ? "" : "s"}`}</Text>
          <SecondaryButton
            accessibilityLabel="Review pending join requests"
            fullWidth
            label="Review Requests"
            onPress={() => handleGroupAction("join-requests")}
            testID="review-pending-requests"
          />
        </View>
      ) : null}

      {!isArchived ? (
        <>
          <GroupPrimaryActions
            activeRollCall={
              activeRollCallQuery.data
                ? { presentCount: activeRollCallQuery.data.presentCount ?? 0 }
                : undefined
            }
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
        <View style={styles.filters}>
          <TextField
            accessibilityLabel="Search group members by name or phone"
            label="Search members"
            onChangeText={setMemberQuery}
            placeholder="Name or phone number"
            testID="group-member-search-field"
            value={memberQuery}
          />
          <SecondaryButton
            accessibilityLabel={`Filter by group role. Current filter: ${roleFilter}`}
            fullWidth
            label={`Role: ${roleFilter}`}
            onPress={cycleRoleFilter}
            testID="group-member-role-filter"
          />
        </View>
        {members.length > 0 ? (
          filteredMembers.length > 0 ? (
            <View style={styles.list}>
              {filteredMembers.map((member) => {
                const memberName = member.profile?.full_name?.trim() || "Unnamed member";
                return (
                  <MemberRow
                    key={member.membershipId}
                    name={memberName}
                    onCall={() => void callMember(memberName, member.profile?.phone ?? null)}
                    onPress={() =>
                      router.push({
                        pathname:
                          "/events/[eventId]/groups/[groupId]/members/[membershipId]" as never,
                        params: {
                          ...groupRouteParams,
                          membershipId: member.membershipId,
                        },
                      })
                    }
                    phone={member.profile?.phone ?? "Phone unavailable"}
                    role={toGroupDisplayRole(member.role)}
                    statusLabel={member.status}
                    testID={`group-member-${member.membershipId}`}
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState
              actionLabel="Clear Filters"
              description="Try another name, phone number, or role."
              onActionPress={() => {
                setMemberQuery("");
                setRoleFilter("all");
              }}
              testID="group-members-no-results"
              title="No matching members"
            />
          )
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
  filters: {
    gap: spacing.md,
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
  prototypeTitle: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  ticketPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  ticketCopy: { flex: 1, gap: spacing.xs },
  requestNotice: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
});
