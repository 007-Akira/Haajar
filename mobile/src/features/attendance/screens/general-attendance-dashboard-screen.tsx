import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AttendanceMemberRow,
  AttendanceProgress,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  TextField,
  useAppDialog,
} from "@/components";
import { useEvent } from "@/features/events/hooks/use-event";
import { useEventMembership } from "@/features/events/hooks/use-event-membership";
import { openPhoneLink } from "@/lib/native/open-phone-link";
import { colors, layout, spacing, typography } from "@/theme";

import { useAttendanceRealtime } from "../hooks/use-attendance-realtime";
import { useCloseRollCall } from "../hooks/use-close-roll-call";
import { useGeneralOperators } from "../hooks/use-general-attendance";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";

export function GeneralAttendanceDashboardScreen(): JSX.Element {
  const dialog = useAppDialog();
  const { eventId, sessionId } = useLocalSearchParams<{ eventId: string; sessionId: string }>();
  const router = useRouter();
  const event = useEvent(eventId);
  const membership = useEventMembership(eventId);
  const dashboard = useRollCallDashboard(sessionId);
  const operators = useGeneralOperators(sessionId);
  const close = useCloseRollCall();
  const realtime = useAttendanceRealtime(
    sessionId,
    dashboard.data?.rollCall.status === "active",
    dashboard.data?.rollCall.sessionId
  );
  const [search, setSearch] = useState("");
  const members = useMemo(
    () =>
      [
        ...(dashboard.data?.remainingMembers ?? []),
        ...(dashboard.data?.presentMembers ?? []),
      ].filter((member) => member.displayName.toLowerCase().includes(search.trim().toLowerCase())),
    [dashboard.data, search]
  );
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if ([event, membership, dashboard, operators].some((query) => query.isLoading))
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="General Attendance" />
        <LoadingSkeleton lines={7} />
      </ScreenContainer>
    );
  if (!event.data || !dashboard.data || dashboard.data.rollCall.scopeType !== "general")
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="General Attendance" />
        <EmptyState
          title="Attendance unavailable"
          description="This General attendance session could not be loaded."
          actionLabel="Retry"
          onActionPress={() => void dashboard.refetch()}
        />
      </ScreenContainer>
    );
  const data = dashboard.data;
  const counts = data.counts ?? { totalRoster: 0, present: 0, remaining: 0, percentage: 0 };
  const superOrganiser =
    membership.data?.status === "active" && membership.data.role === "super_organiser";
  const closed = data.rollCall.status === "closed";
  if (!data.permissions.canScan && !superOrganiser)
    return (
      <ScreenContainer showGrid testID="general-dashboard-unauthorised">
        <PageHeader leadingAction={back} title="General Attendance" />
        <EmptyState
          title="Operator access required"
          description="You are not assigned to operate this attendance session."
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer
      scroll
      showGrid
      refreshing={dashboard.isRefetching}
      onRefresh={() => void dashboard.refetch()}
      contentContainerStyle={styles.content}
      testID="general-attendance-dashboard"
    >
      <PageHeader
        leadingAction={back}
        subtitle={event.data.name}
        title={closed ? "General Attendance Summary" : "General Attendance"}
      />
      <View style={styles.summary}>
        <Text style={styles.technical}>
          {closed ? "[ CLOSED ]" : `[ ${realtime.toUpperCase()} ]`}
        </Text>
        <Text style={styles.title}>{data.rollCall.title}</Text>
        <Text style={styles.meta}>
          {counts.present} present · {counts.remaining} {closed ? "absent" : "remaining"} ·{" "}
          {counts.totalRoster} total
        </Text>
        <AttendanceProgress present={counts.present} total={counts.totalRoster} />
      </View>
      {superOrganiser ? (
        <View>
          <SectionHeader
            title="Volunteers"
            description="Temporary permissions for this session only."
          />
          {(operators.data ?? []).map((operator) => (
            <Text key={operator.userId} style={styles.operator}>
              {operator.name} · SCAN {operator.canScan ? "ON" : "OFF"} · MANUAL{" "}
              {operator.canMarkManually ? "ON" : "OFF"}
            </Text>
          ))}
        </View>
      ) : null}
      {!closed ? (
        <View style={styles.actions}>
          {data.permissions.canScan ? (
            <PrimaryButton
              fullWidth
              label="Scan Tickets"
              onPress={() =>
                router.push(`/events/${eventId}/attendance/general/${sessionId}/scanner`)
              }
            />
          ) : null}
          {data.permissions.canMarkManually ? (
            <SecondaryButton
              fullWidth
              label="Mark Manually"
              onPress={() =>
                router.push(`/events/${eventId}/attendance/general/${sessionId}/manual`)
              }
            />
          ) : null}
          {superOrganiser ? (
            <SecondaryButton
              fullWidth
              label="Manage Volunteers"
              onPress={() =>
                router.push(`/events/${eventId}/attendance/general/${sessionId}/volunteers`)
              }
            />
          ) : null}
          {superOrganiser ? (
            <SecondaryButton
              fullWidth
              label="Close Attendance"
              loading={close.isPending}
              onPress={() =>
                dialog.alert("Close General attendance?", "Normal attendance marking will stop.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Close",
                    style: "destructive",
                    onPress: () =>
                      void close
                        .closeRollCall({ groupId: eventId, rollCallId: sessionId })
                        .then(() => dashboard.refetch()),
                  },
                ])
              }
            />
          ) : null}
        </View>
      ) : null}
      <SectionHeader
        title={closed ? "Attendance roster" : "Remaining members"}
        description="Counts and members come from the session roster snapshot."
      />
      <TextField label="Search" placeholder="Member name" value={search} onChangeText={setSearch} />
      {members.map((member) => (
        <AttendanceMemberRow
          key={member.rosterEntryId ?? member.userId}
          name={member.displayName}
          phone={member.phone ?? "Phone unavailable"}
          status={member.status}
          onCall={member.phone ? () => void openPhoneLink(member.phone) : undefined}
        />
      ))}
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  summary: { gap: spacing.sm },
  technical: { ...typography.technicalLabel, color: colors.accent },
  title: { ...typography.headingLarge, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary },
  operator: { ...typography.body, color: colors.textPrimary, minHeight: layout.minimumTouchTarget },
  actions: { gap: spacing.sm },
});
