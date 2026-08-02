import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AttendanceMemberRow,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  RollCallSummaryCard,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  TextField,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import {
  getAttendanceDashboardState,
  getDashboardActionVisibility,
  getRollCallCreatorName,
  getVisibleDashboardMembers,
  type AttendanceDashboardFilter,
} from "../config/roll-call-dashboard-view";
import { useCloseRollCall } from "../hooks/use-close-roll-call";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";
import type { RollCallDashboard } from "../types/attendance-contracts";

const filters: { label: string; value: AttendanceDashboardFilter }[] = [
  { label: "All", value: "all" },
  { label: "Present", value: "present" },
  { label: "Remaining", value: "remaining" },
];

export function ActiveRollCallScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId, rollCallId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    rollCallId: string;
  }>();
  const groupQuery = useGroup(groupId);
  const dashboardQuery = useRollCallDashboard(rollCallId);
  const closeMutation = useCloseRollCall();
  const [filter, setFilter] = useState<AttendanceDashboardFilter>("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const refreshing = dashboardQuery.isRefetching || groupQuery.isRefetching;

  async function refresh(): Promise<void> {
    await Promise.all([dashboardQuery.refetch(), groupQuery.refetch()]);
  }

  if (dashboardQuery.isPending || groupQuery.isPending) {
    return (
      <DashboardFrame onBack={() => router.back()}>
        <LoadingSkeleton lines={8} testID="roll-call-dashboard-loading" />
      </DashboardFrame>
    );
  }

  if (dashboardQuery.isError || groupQuery.isError) {
    const error = dashboardQuery.error ?? groupQuery.error;
    if (
      isAppError(error) &&
      (error.code === appErrorCodes.authenticationRequired ||
        error.code === appErrorCodes.permissionDenied)
    ) {
      return (
        <DashboardState
          description="Only authorised attendance organisers can open this dashboard."
          onBack={() => router.back()}
          testID="roll-call-dashboard-unauthorised"
          title="Operational access required"
        />
      );
    }
    return (
      <DashboardFrame onBack={() => router.back()}>
        <EmptyState
          actionLabel="Retry"
          description="We couldn't load this roll call. Check your connection and try again."
          onActionPress={() => void refresh()}
          testID="roll-call-dashboard-error"
          title="Dashboard unavailable"
        />
      </DashboardFrame>
    );
  }

  const dashboard = dashboardQuery.data;
  const group = groupQuery.data;
  if (!dashboard || !group || dashboard.rollCall.groupId !== groupId || group.eventId !== eventId) {
    return (
      <DashboardFrame onBack={() => router.back()}>
        <EmptyState
          description="This roll call could not be found in the selected group."
          testID="roll-call-dashboard-missing"
          title="Roll call unavailable"
        />
      </DashboardFrame>
    );
  }

  const state = getAttendanceDashboardState(dashboard, group.status, group.eventStatus);
  if (state === "unauthorised") {
    return (
      <DashboardState
        onBack={() => router.back()}
        testID="roll-call-dashboard-unauthorised"
        title="Operational access required"
        description="Only authorised attendance organisers can open this dashboard."
      />
    );
  }
  if (state === "archived") {
    return (
      <DashboardState
        onBack={() => router.back()}
        testID="roll-call-dashboard-archived"
        title="Trip or group archived"
        description="Operational attendance controls are unavailable for archived trips and groups."
      />
    );
  }

  return (
    <DashboardContent
      dashboard={dashboard}
      feedback={feedback}
      filter={filter}
      groupId={groupId}
      groupName={group.name}
      isClosing={closeMutation.isPending}
      onBack={() => router.back()}
      onClose={() => {
        Alert.alert(
          "Close roll call?",
          "Normal attendance marking stops after closure. The final present and remaining counts will be preserved.",
          [
            { style: "cancel", text: "Keep Open" },
            {
              style: "destructive",
              text: "Close Roll Call",
              onPress: () => {
                void (async () => {
                  setFeedback("");
                  try {
                    const result = await closeMutation.closeRollCall({ groupId, rollCallId });
                    await dashboardQuery.refetch();
                    router.replace({
                      pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
                      params: { eventId, groupId, rollCallId },
                    });
                    Alert.alert(
                      "Roll call closed",
                      `${result.presentCount} present · ${result.remainingCount} remaining`
                    );
                  } catch {
                    setFeedback("The roll call could not be closed. Please retry safely.");
                  }
                })();
              },
            },
          ]
        );
      }}
      onFilter={setFilter}
      onManual={() =>
        router.push({
          pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/manual",
          params: { eventId, groupId, rollCallId },
        })
      }
      onRefresh={() => void refresh()}
      onScan={() =>
        router.push({
          pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/scanner",
          params: { eventId, groupId, rollCallId },
        })
      }
      onSearch={setSearch}
      refreshing={refreshing}
      search={search}
      tripName={group.eventName ?? "Trip"}
    />
  );
}

interface DashboardContentProps {
  dashboard: RollCallDashboard;
  groupId: string;
  groupName: string;
  tripName: string;
  filter: AttendanceDashboardFilter;
  search: string;
  feedback: string;
  isClosing: boolean;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onFilter: (filter: AttendanceDashboardFilter) => void;
  onSearch: (value: string) => void;
  onScan: () => void;
  onManual: () => void;
  onClose: () => void;
}

function DashboardContent(props: DashboardContentProps): JSX.Element {
  const members = useMemo(
    () => getVisibleDashboardMembers(props.dashboard, props.filter, props.search),
    [props.dashboard, props.filter, props.search]
  );
  const actions = getDashboardActionVisibility(props.dashboard);
  const counts = props.dashboard.counts ?? { totalRoster: 0, present: 0, remaining: 0 };
  const closed = props.dashboard.rollCall.status === "closed";

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={props.onRefresh}
      refreshing={props.refreshing}
      scroll
      showGrid
      testID={closed ? "closed-roll-call-summary" : "active-roll-call-dashboard"}
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to group details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: props.onBack,
        }}
        subtitle={props.tripName}
        title={closed ? "Roll Call Summary" : "Active Roll Call"}
      />
      <RollCallSummaryCard
        absentCount={closed ? counts.remaining : undefined}
        createdBy={getRollCallCreatorName(props.dashboard)}
        groupName={props.groupName}
        name={props.dashboard.rollCall.title}
        presentCount={counts.present}
        status={props.dashboard.rollCall.status}
        startedAt={formatDateTime(props.dashboard.rollCall.startedAt)}
        testID="roll-call-summary"
        unmarkedCount={closed ? 0 : counts.remaining}
      />
      <Text style={styles.tripName}>{props.tripName}</Text>

      {!closed ? (
        <View style={styles.actions}>
          {actions.canScan ? (
            <PrimaryButton
              fullWidth
              label="Scan Tickets"
              onPress={props.onScan}
              testID="scan-tickets-button"
            />
          ) : null}
          {actions.canMarkManually ? (
            <SecondaryButton
              fullWidth
              label="Mark Manually"
              onPress={props.onManual}
              testID="mark-manually-button"
            />
          ) : null}
        </View>
      ) : (
        <Text style={styles.closedCopy}>
          This roll call is closed. Normal attendance marking has stopped.
        </Text>
      )}

      {props.feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {props.feedback}
        </Text>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          description={`${counts.totalRoster} members in the roster captured when this roll call started.`}
          title="Attendance roster"
        />
        <TextField
          accessibilityLabel="Search attendance roster"
          label="Search"
          onChangeText={props.onSearch}
          placeholder="Search by name or phone"
          testID="attendance-search"
          value={props.search}
        />
        <View accessibilityRole="tablist" style={styles.filters}>
          {filters.map((item) => (
            <Pressable
              key={item.value}
              accessibilityLabel={`Show ${item.label.toLowerCase()} members`}
              accessibilityRole="tab"
              accessibilityState={{ selected: props.filter === item.value }}
              onPress={() => props.onFilter(item.value)}
              style={[styles.filter, props.filter === item.value && styles.selectedFilter]}
              testID={`attendance-filter-${item.value}`}
            >
              <Text
                style={[
                  styles.filterLabel,
                  props.filter === item.value && styles.selectedFilterLabel,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {members.length === 0 ? (
          <EmptyState
            description="No roster members match the current search and filter."
            testID="attendance-members-empty"
            title={counts.totalRoster === 0 ? "Empty roster" : "No matching members"}
          />
        ) : (
          <View style={styles.list}>
            {members.map((member) => (
              <AttendanceMemberRow
                key={member.membershipId}
                markedAt={member.markedAt ? formatDateTime(member.markedAt) : undefined}
                name={member.displayName}
                phone={member.phone ?? "Phone unavailable"}
                status={member.status}
                testID={`attendance-member-${member.membershipId}`}
              />
            ))}
          </View>
        )}
      </View>

      {actions.canClose ? (
        <SecondaryButton
          disabled={props.isClosing}
          fullWidth
          label="Close Roll Call"
          loading={props.isClosing}
          onPress={props.onClose}
          testID="close-roll-call-button"
        />
      ) : null}
    </ScreenContainer>
  );
}

function DashboardFrame({
  children,
  onBack,
}: {
  children: JSX.Element;
  onBack: () => void;
}): JSX.Element {
  return (
    <ScreenContainer contentContainerStyle={styles.content} scroll showGrid>
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: onBack,
        }}
        title="Roll Call"
      />
      {children}
    </ScreenContainer>
  );
}

function DashboardState({
  description,
  onBack,
  testID,
  title,
}: {
  description: string;
  onBack: () => void;
  testID: string;
  title: string;
}): JSX.Element {
  return (
    <DashboardFrame onBack={onBack}>
      <EmptyState description={description} testID={testID} title={title} />
    </DashboardFrame>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  actions: { gap: spacing.sm },
  tripName: { ...typography.caption, color: colors.textSecondary },
  closedCopy: { ...typography.body, color: colors.textSecondary },
  feedback: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.md },
  filters: { flexDirection: "row", gap: spacing.xs },
  filter: {
    minHeight: layout.minimumTouchTarget,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  selectedFilter: { backgroundColor: colors.accent, borderColor: colors.textPrimary },
  filterLabel: { ...typography.technicalLabel, color: colors.textSecondary },
  selectedFilterLabel: { color: colors.textPrimary },
  list: { gap: spacing.sm },
});
