import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AttendanceMemberRow,
  PageHeader,
  PrimaryButton,
  RollCallSummaryCard,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from "@/components";
import { getMockGroupDetails } from "@/features/groups/data/mock-group-details";
import { colors, layout, spacing, typography } from "@/theme";

import { getMockRollCall, type AttendanceStatus } from "../data/mock-roll-calls";
import { getRollCallPermissions } from "../permissions/roll-call-permissions";

type StatusFilter = "all" | AttendanceStatus;
const filters: StatusFilter[] = ["all", "present", "unmarked", "absent"];

export function ActiveRollCallScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    rollCallId: string;
    state?: string;
  }>();
  const group = getMockGroupDetails(params.eventId, params.groupId);
  const rollCall = getMockRollCall(params.groupId, params.rollCallId);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [message, setMessage] = useState("");
  const closed = params.state === "closed";
  const permissions = getRollCallPermissions(group?.userRole ?? "member");
  const members = useMemo(() => {
    const visible = permissions.canViewAllStatuses
      ? rollCall.members
      : rollCall.members.filter((member) => member.id === "mathews");
    return filter === "all" ? visible : visible.filter((member) => member.status === filter);
  }, [filter, permissions.canViewAllStatuses, rollCall.members]);
  const presentCount = rollCall.members.filter((member) => member.status === "present").length;
  const unmarkedCount = rollCall.members.filter((member) => member.status === "unmarked").length;

  function cycleFilter(): void {
    const index = filters.indexOf(filter);
    setFilter(filters[(index + 1) % filters.length] ?? "all");
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="active-roll-call-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to group details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
        }}
        subtitle={group?.name ?? rollCall.groupName}
        title="Active Roll Call"
      />
      <RollCallSummaryCard
        absentCount={closed ? 1 : undefined}
        createdBy={rollCall.createdBy}
        groupName={group?.name ?? rollCall.groupName}
        name={rollCall.name}
        pendingSyncCount={rollCall.pendingSyncCount}
        presentCount={presentCount}
        startedAt={rollCall.startedAt}
        testID="roll-call-summary"
        unmarkedCount={unmarkedCount}
      />

      {permissions.canScan ? (
        <PrimaryButton
          fullWidth
          label="Open Scanner"
          onPress={() =>
            router.push({
              pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/scanner",
              params,
            })
          }
          testID="open-scanner-button"
        />
      ) : null}
      {permissions.canMarkManually ? (
        <SecondaryButton
          fullWidth
          label="Manual Attendance"
          onPress={() => setMessage("Manual attendance placeholder selected.")}
          testID="manual-attendance-button"
        />
      ) : null}
      {permissions.canOpenEventControls ? (
        <SecondaryButton
          fullWidth
          label="Event Controls"
          onPress={() => setMessage("Event-level controls placeholder selected.")}
        />
      ) : null}

      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          description={
            permissions.canViewAllStatuses
              ? "Review present and unmarked members."
              : "Your attendance status."
          }
          title={permissions.canViewAllStatuses ? "Member statuses" : "My attendance"}
        />
        {permissions.canViewAllStatuses ? (
          <SecondaryButton
            fullWidth
            label={`Filter: ${filter}`}
            onPress={cycleFilter}
            testID="attendance-status-filter"
          />
        ) : null}
        <View style={styles.list}>
          {members.map((member) => (
            <AttendanceMemberRow
              key={member.id}
              markedAt={member.markedAt}
              name={member.name}
              phone={member.phone}
              status={member.status}
              testID={`attendance-member-${member.id}`}
            />
          ))}
        </View>
      </View>

      {permissions.canClose && !closed ? (
        <SecondaryButton
          fullWidth
          label="Close Roll Call"
          onPress={() => setMessage("Close roll call confirmation placeholder selected.")}
          testID="close-roll-call-button"
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  message: { ...typography.caption, color: colors.textSecondary },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
});
