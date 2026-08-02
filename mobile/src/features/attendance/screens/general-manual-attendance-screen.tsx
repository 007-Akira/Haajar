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
import { StyleSheet, View } from "react-native";
import { useRollCallDashboard } from "../hooks/use-roll-call-dashboard";
import { useMarkManualAttendance } from "../hooks/use-mark-manual-attendance";
export function GeneralManualAttendanceScreen(): JSX.Element {
  const { eventId, sessionId } = useLocalSearchParams<{ eventId: string; sessionId: string }>();
  const router = useRouter();
  const dashboard = useRollCallDashboard(sessionId);
  const mutation = useMarkManualAttendance();
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
        <View key={member.rosterEntryId ?? member.userId} style={styles.row}>
          <AttendanceMemberRow
            name={member.displayName}
            phone={member.phone ?? "Phone unavailable"}
            status={member.status}
          />
          <PrimaryButton
            label="Mark Present"
            loading={mutation.isPending}
            onPress={() =>
              void mutation
                .markManualAttendance({
                  groupId: eventId,
                  rollCallId: sessionId,
                  membershipId: member.membershipId,
                })
                .then(() => dashboard.refetch())
            }
          />
        </View>
      ))}
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, row: { gap: spacing.sm } });
