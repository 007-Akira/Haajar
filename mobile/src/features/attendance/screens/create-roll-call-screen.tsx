import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  TextField,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupMembership } from "@/features/groups/hooks/use-group-membership";
import { useEventGroups } from "@/features/events/hooks/use-event-groups";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import {
  buildRollCallDashboardRoute,
  createRollCallFailureMessage,
  getCreateRollCallAccess,
  mapCreateRollCallFailure,
  normalizeRollCallTitle,
  type CreateRollCallFailure,
} from "../config/create-roll-call-flow";
import { useActiveRollCall } from "../hooks/use-active-roll-call";
import { useCreateRollCall } from "../hooks/use-create-roll-call";

export function CreateRollCallScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const [label, setLabel] = useState("");
  const [failure, setFailure] = useState<CreateRollCallFailure | null>(null);
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const eventGroupsQuery = useEventGroups(groupQuery.data?.eventId);
  const activeRollCallQuery = useActiveRollCall(groupId);
  const createMutation = useCreateRollCall();
  const activeRollCallId = activeRollCallQuery.data?.id;

  useEffect(() => {
    if (!activeRollCallId) return;
    router.replace(buildRollCallDashboardRoute(eventId, groupId, activeRollCallId));
  }, [activeRollCallId, eventId, groupId, router]);

  const backAction = {
    accessibilityLabel: "Go back to group details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "create-roll-call-back",
  };
  const loading =
    groupQuery.isLoading ||
    membershipQuery.isLoading ||
    eventGroupsQuery.isLoading ||
    activeRollCallQuery.isLoading;

  if (loading || activeRollCallId) {
    return (
      <ScreenContainer scroll showGrid testID="create-roll-call-loading">
        <PageHeader leadingAction={backAction} title="Start Roll Call" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  const failedQuery = [groupQuery, membershipQuery, eventGroupsQuery, activeRollCallQuery].find(
    (query) => query.isError
  );
  if (failedQuery) {
    return (
      <ScreenContainer showGrid testID="create-roll-call-query-error">
        <PageHeader leadingAction={backAction} title="Start Roll Call" />
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
            void eventGroupsQuery.refetch();
            void activeRollCallQuery.refetch();
          }}
          title="Could not prepare roll call"
        />
      </ScreenContainer>
    );
  }

  const group = groupQuery.data;
  const membership = membershipQuery.data;
  const activeMemberCount = (eventGroupsQuery.data ?? [])
    .filter((candidate) => candidate.parentGroupId === groupId)
    .reduce((total, candidate) => total + candidate.activeMemberCount, 0);
  if (!group) {
    return (
      <ScreenContainer showGrid testID="create-roll-call-missing-group">
        <PageHeader leadingAction={backAction} title="Start Roll Call" />
        <EmptyState
          actionLabel="Go Back"
          description="This group could not be found."
          onActionPress={() => router.back()}
          title="Group unavailable"
        />
      </ScreenContainer>
    );
  }

  if (group.groupKind !== "category") {
    return (
      <ScreenContainer showGrid testID="create-roll-call-operational-blocked">
        <PageHeader leadingAction={backAction} title="Start Category Attendance" />
        <EmptyState
          actionLabel="Go Back"
          description="Attendance sessions start from the parent category. Operational groups receive their own unit automatically."
          onActionPress={() => router.back()}
          title="Start from the category"
        />
      </ScreenContainer>
    );
  }

  const access = getCreateRollCallAccess({
    membershipRole: membership?.role ?? null,
    membershipStatus: membership?.status ?? null,
    groupStatus: group.status,
    eventStatus: group.eventStatus,
    activeMemberCount,
  });
  if (!access.allowed) {
    const descriptions = {
      archived: "Archived groups or trips cannot start a roll call.",
      no_active_members: "Add an active member before starting a roll call.",
      unauthorised: "Only an active organiser or super organiser can start a roll call.",
    } as const;
    return (
      <ScreenContainer showGrid testID={`create-roll-call-blocked-${access.reason}`}>
        <PageHeader leadingAction={backAction} title="Start Roll Call" />
        <EmptyState
          actionLabel="Go Back"
          description={descriptions[access.reason ?? "unauthorised"]}
          onActionPress={() => router.back()}
          title="Action unavailable"
        />
      </ScreenContainer>
    );
  }
  const selectedGroupId = group.id;

  async function handleStart(): Promise<void> {
    setFailure(null);
    try {
      const rollCallId = await createMutation.createRollCall({
        groupId: selectedGroupId,
        title: normalizeRollCallTitle(label),
      });
      router.replace(buildRollCallDashboardRoute(eventId, selectedGroupId, rollCallId));
    } catch (error) {
      const mappedFailure = mapCreateRollCallFailure(error);
      if (mappedFailure === "active_roll_call_exists") {
        const refreshed = await activeRollCallQuery.refetch();
        if (refreshed.data) {
          router.replace(buildRollCallDashboardRoute(eventId, selectedGroupId, refreshed.data.id));
          return;
        }
      }
      setFailure(mappedFailure);
    }
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="create-roll-call-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={group.eventName ?? "Trip"}
        title="Start Roll Call"
      />

      <View style={styles.summary} testID="create-roll-call-group-summary">
        <Text style={styles.eyebrow}>[ CURRENT ROSTER ]</Text>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.tripName}>{group.eventName ?? "Trip"}</Text>
        <View style={styles.countRow}>
          <Text style={styles.count}>{activeMemberCount}</Text>
          <Text style={styles.countLabel}>ACTIVE MEMBERS</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Roster snapshot</Text>
        <Text style={styles.noticeBody}>
          Starting now creates one attendance unit for every operational subgroup and preserves each
          subgroup roster for history.
        </Text>
      </View>

      <TextField
        accessibilityLabel="Optional roll-call label"
        helperText="Optional. Haajar will use “Roll call” when left blank."
        label="Roll-call label"
        onChangeText={setLabel}
        placeholder="Before departure"
        testID="roll-call-label-field"
        value={label}
      />

      {failure ? (
        <Text accessibilityRole="alert" style={styles.error} testID="create-roll-call-error">
          {createRollCallFailureMessage(failure)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          accessibilityLabel="Start roll call with current active roster"
          disabled={createMutation.isPending}
          fullWidth
          highContrast
          label="Start Roll Call"
          loading={createMutation.isPending}
          onPress={() => void handleStart()}
          testID="submit-roll-call-button"
        />
        <SecondaryButton
          accessibilityLabel="Cancel starting roll call"
          disabled={createMutation.isPending}
          fullWidth
          label="Cancel"
          onPress={() => router.back()}
          testID="cancel-roll-call-button"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  summary: {
    gap: spacing.xs,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  eyebrow: { ...typography.technicalLabel, color: colors.accent },
  groupName: { ...typography.headingLarge, color: colors.textPrimary },
  tripName: { ...typography.body, color: colors.textSecondary },
  countRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  count: { ...typography.displayLarge, color: colors.textPrimary },
  countLabel: { ...typography.technicalLabel, color: colors.textSecondary },
  notice: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  noticeTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  noticeBody: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.bodyMedium, color: colors.danger },
  actions: { gap: spacing.sm },
});
