import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AttendanceMemberRow,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  RoleBadge,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  SegmentedTabs,
  TextField,
  type UserRole,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { openPhoneLink } from "@/lib/native/open-phone-link";
import { colors, layout, spacing, typography } from "@/theme";

import {
  canManageManualAttendance,
  getManualAttendanceMembers,
  type ManualAttendanceRoleFilter,
} from "../config/manual-attendance-view";
import { useMarkManualAttendance } from "../hooks/use-mark-manual-attendance";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";
import type { RollCallDashboardMember } from "../types/attendance-contracts";

const roleTabs = [
  { label: "All", value: "all" },
  { label: "Members", value: "members" },
  { label: "Organisers", value: "organisers" },
] satisfies { label: string; value: ManualAttendanceRoleFilter }[];

export function ManualAttendanceScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId, rollCallId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    rollCallId: string;
  }>();
  const groupQuery = useGroup(groupId);
  const dashboardQuery = useRollCallDashboard(rollCallId);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<ManualAttendanceRoleFilter>("all");
  const refreshing = groupQuery.isRefetching || dashboardQuery.isRefetching;

  async function refresh(): Promise<void> {
    await Promise.all([groupQuery.refetch(), dashboardQuery.refetch()]);
  }

  if (groupQuery.isPending || dashboardQuery.isPending) {
    return (
      <Frame onBack={() => router.back()}>
        <LoadingSkeleton lines={8} testID="manual-attendance-loading" />
      </Frame>
    );
  }
  if (groupQuery.isError || dashboardQuery.isError) {
    const error = dashboardQuery.error ?? groupQuery.error;
    const unauthorised =
      isAppError(error) &&
      (error.code === appErrorCodes.authenticationRequired ||
        error.code === appErrorCodes.permissionDenied);
    return (
      <Frame onBack={() => router.back()}>
        <EmptyState
          actionLabel={unauthorised ? undefined : "Retry"}
          description={
            unauthorised
              ? "You do not have permission to manage attendance for this group."
              : "The active roster could not be loaded. Check your connection and retry."
          }
          onActionPress={unauthorised ? undefined : () => void refresh()}
          testID={unauthorised ? "manual-attendance-unauthorised" : "manual-attendance-error"}
          title={unauthorised ? "Organiser access required" : "Roster unavailable"}
        />
      </Frame>
    );
  }

  const group = groupQuery.data;
  const dashboard = dashboardQuery.data;
  if (
    !group ||
    !dashboard ||
    group.eventId !== eventId ||
    dashboard.rollCall.groupId !== groupId ||
    dashboard.rollCall.eventId !== eventId
  ) {
    return (
      <Frame onBack={() => router.back()}>
        <EmptyState
          description="This roll call does not belong to the selected group."
          testID="manual-attendance-missing"
          title="Roster unavailable"
        />
      </Frame>
    );
  }
  if (dashboard.rollCall.status === "closed") {
    return (
      <Frame onBack={() => router.back()}>
        <EmptyState
          description={`${dashboard.counts?.present ?? 0} present · ${dashboard.counts?.remaining ?? 0} absent. Attendance can no longer be changed.`}
          testID="manual-attendance-closed"
          title="Roll call closed"
        />
      </Frame>
    );
  }
  if (
    !canManageManualAttendance(dashboard) ||
    group.status === "archived" ||
    group.eventStatus === "archived"
  ) {
    return (
      <Frame onBack={() => router.back()}>
        <EmptyState
          description="Only an active organiser authorised by the backend can mark attendance manually."
          testID="manual-attendance-unauthorised"
          title="Organiser access required"
        />
      </Frame>
    );
  }

  const members = getManualAttendanceMembers(dashboard, search, roleFilter);
  const total = dashboard.counts?.totalRoster ?? 0;
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      scroll
      showGrid
      testID="manual-attendance-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Return to active roll call",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
        }}
        subtitle={`${group.name} · ${dashboard.rollCall.status.toUpperCase()}`}
        title="Mark Manually"
      />
      <SectionHeader
        description={`${dashboard.counts?.remaining ?? 0} remaining of ${total}. Present records are retained and cannot be duplicated.`}
        title="Active roster"
      />
      <TextField
        accessibilityLabel="Search active attendance roster"
        label="Search"
        onChangeText={setSearch}
        placeholder="Search by name or phone"
        testID="manual-attendance-search"
        value={search}
      />
      <SegmentedTabs
        accessibilityLabel="Filter roster by role"
        onChange={setRoleFilter}
        tabs={roleTabs}
        testID="manual-attendance-role-filter"
        value={roleFilter}
      />

      {total === 0 ? (
        <EmptyState
          description="No active memberships were captured when this roll call started."
          testID="manual-attendance-empty"
          title="Empty roster"
        />
      ) : members.length === 0 ? (
        <EmptyState
          description="No roster members match the current search and role filter."
          testID="manual-attendance-no-results"
          title="No matching members"
        />
      ) : (
        <View style={styles.list}>
          {members.map((member) => (
            <ManualRosterRow
              groupId={groupId}
              key={member.membershipId}
              member={member}
              onMarked={() => void dashboardQuery.refetch()}
              rollCallId={rollCallId}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

interface ManualRosterRowProps {
  groupId: string;
  rollCallId: string;
  member: RollCallDashboardMember;
  onMarked: () => void;
}

function ManualRosterRow({
  groupId,
  member,
  onMarked,
  rollCallId,
}: ManualRosterRowProps): JSX.Element {
  const mutation = useMarkManualAttendance();
  const [error, setError] = useState("");

  async function markPresent(): Promise<void> {
    setError("");
    try {
      const result = await mutation.markManualAttendance({
        groupId,
        membershipId: member.membershipId,
        rollCallId,
      });
      if (result.outcome === "marked" || result.outcome === "already_marked") onMarked();
      if (result.outcome !== "marked" && result.outcome !== "already_marked") {
        setError("This member could not be marked present.");
      }
    } catch (caught) {
      setError(
        isAppError(caught) && caught.code === appErrorCodes.network
          ? "Network unavailable. Attendance was not changed."
          : "Attendance could not be updated safely."
      );
    }
  }

  async function callMember(): Promise<void> {
    setError("");
    try {
      const opened = await openPhoneLink(member.phone);
      if (!opened) setError("No phone number is available for this member.");
    } catch {
      setError("The phone app could not be opened.");
    }
  }

  return (
    <View style={styles.row} testID={`manual-attendance-member-${member.membershipId}`}>
      <AttendanceMemberRow
        markedAt={member.markedAt ? formatTime(member.markedAt) : undefined}
        name={member.displayName}
        phone={member.phone ?? "Phone unavailable"}
        status={member.status}
      />
      <RoleBadge role={toBadgeRole(member.role)} />
      <View style={styles.rowActions}>
        <SecondaryButton
          disabled={!member.phone}
          label="Call"
          onPress={() => void callMember()}
          testID={`call-attendance-member-${member.membershipId}`}
        />
        {member.status === "unmarked" ? (
          <SecondaryButton
            disabled={mutation.isPending}
            label="Mark Present"
            loading={mutation.isPending}
            onPress={() => void markPresent()}
            testID={`mark-present-${member.membershipId}`}
          />
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Frame({ children, onBack }: { children: JSX.Element; onBack: () => void }): JSX.Element {
  return (
    <ScreenContainer contentContainerStyle={styles.content} scroll showGrid>
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: onBack,
        }}
        title="Manual Attendance"
      />
      {children}
    </ScreenContainer>
  );
}

function toBadgeRole(role: string): UserRole {
  if (role === "co_organiser") return "co-organiser";
  if (role === "super_organiser") return "super organiser";
  return role === "organiser" ? "organiser" : "member";
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  list: { gap: spacing.md },
  row: { gap: spacing.xs },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  error: { ...typography.caption, color: colors.danger },
});
