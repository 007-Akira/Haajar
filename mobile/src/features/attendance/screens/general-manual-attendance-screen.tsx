import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import {
  AttendanceMemberRow,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  TextField,
} from "@/components";
import { colors, layout, spacing } from "@/theme";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { StyleSheet, Text, View } from "react-native";

import { getManualAttendanceTarget } from "../config/manual-attendance-view";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";
import { useMarkManualAttendance } from "../hooks/use-mark-manual-attendance";
import type { RollCallDashboard, RollCallDashboardMember } from "../types/attendance-contracts";
export function GeneralManualAttendanceScreen(): JSX.Element {
  const { eventId, sessionId } = useLocalSearchParams<{ eventId: string; sessionId: string }>();
  const router = useRouter();
  const dashboard = useRollCallDashboard(sessionId);
  const [search, setSearch] = useState("");
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if (dashboard.isLoading)
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Manual Attendance" />
        <LoadingSkeleton lines={6} />
      </ScreenContainer>
    );
  if (
    !dashboard.data ||
    !dashboard.data.permissions.canMarkManually ||
    dashboard.data.rollCall.scopeType !== "general"
  )
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Manual Attendance" />
        <EmptyState
          title="Manual attendance unavailable"
          description="You do not have temporary manual-mark permission for this active General session."
        />
      </ScreenContainer>
    );
  const members = dashboard.data.remainingMembers.filter((m) =>
    m.displayName.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <ScreenContainer scroll showGrid contentContainerStyle={styles.content}>
      <PageHeader leadingAction={back} subtitle="General attendance" title="Mark Manually" />
      <TextField label="Search" value={search} onChangeText={setSearch} />
      {members.map((member) => (
        <GeneralManualRow
          dashboard={dashboard.data}
          eventId={eventId}
          key={member.rosterEntryId ?? member.userId}
          member={member}
          onMarked={() => void dashboard.refetch()}
        />
      ))}
    </ScreenContainer>
  );
}

function GeneralManualRow({
  dashboard,
  eventId,
  member,
  onMarked,
}: {
  dashboard: RollCallDashboard;
  eventId: string;
  member: RollCallDashboardMember;
  onMarked: () => void;
}): JSX.Element {
  const mutation = useMarkManualAttendance();
  const [error, setError] = useState("");
  const target = getManualAttendanceTarget(dashboard, member);

  async function markPresent(): Promise<void> {
    setError("");
    try {
      const result = await mutation.markManualAttendance({
        groupId: eventId,
        rollCallId: target.rollCallId,
        membershipId: target.membershipId,
      });
      if (result.outcome === "marked" || result.outcome === "already_marked") {
        onMarked();
      } else {
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

  return (
    <View style={styles.row}>
      <AttendanceMemberRow
        name={member.displayName}
        phone={member.phone ?? "Phone unavailable"}
        status={member.status}
      />
      <PrimaryButton
        label="Mark Present"
        loading={mutation.isPending}
        disabled={mutation.isPending}
        onPress={() => void markPresent()}
        testID={`general-mark-present-${member.rosterEntryId ?? member.userId}`}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  row: { gap: spacing.sm },
  error: { color: colors.danger },
});
