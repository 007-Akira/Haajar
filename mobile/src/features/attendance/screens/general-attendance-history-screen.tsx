import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, LoadingSkeleton, PageHeader, ScreenContainer } from "@/components";
import { useEvent } from "@/features/events/hooks/use-event";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { colors, layout, spacing } from "@/theme";

import { RollCallHistoryRow } from "../components/roll-call-history-row";
import { useGeneralAttendanceHistory } from "../hooks/use-general-attendance-history";

export function GeneralAttendanceHistoryScreen(): JSX.Element {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const eventQuery = useEvent(eventId);
  const historyQuery = useGeneralAttendanceHistory(eventId);
  const refresh = () => Promise.all([eventQuery.refetch(), historyQuery.refetch()]);
  const header = (
    <PageHeader
      leadingAction={{
        accessibilityLabel: "Return to trip details",
        icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
        onPress: () => router.back(),
      }}
      subtitle={eventQuery.data?.name}
      title="General Attendance History"
    />
  );

  if (eventQuery.isPending || historyQuery.isPending) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="general-attendance-history-loading"
      >
        {header}
        <LoadingSkeleton lines={8} />
      </ScreenContainer>
    );
  }
  if (eventQuery.isError || historyQuery.isError) {
    const error = historyQuery.error ?? eventQuery.error;
    const unauthorised =
      isAppError(error) &&
      (error.code === appErrorCodes.authenticationRequired ||
        error.code === appErrorCodes.permissionDenied);
    return (
      <ScreenContainer contentContainerStyle={styles.content} scroll showGrid>
        {header}
        <EmptyState
          actionLabel={unauthorised ? undefined : "Retry"}
          description={
            unauthorised
              ? "You do not have permission to view this trip’s attendance history."
              : "History could not be loaded. Check your connection and retry."
          }
          onActionPress={unauthorised ? undefined : () => void refresh()}
          testID={
            unauthorised
              ? "general-attendance-history-unauthorised"
              : "general-attendance-history-error"
          }
          title={unauthorised ? "History unavailable" : "Could not load history"}
        />
      </ScreenContainer>
    );
  }

  const history = historyQuery.data ?? [];
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void refresh()}
      refreshing={eventQuery.isRefetching || historyQuery.isRefetching}
      scroll
      showGrid
      testID="general-attendance-history-screen"
    >
      {header}
      {history.length === 0 ? (
        <EmptyState
          description="General roll calls for the Main Group will appear here."
          testID="general-attendance-history-empty"
          title="No General roll calls yet"
        />
      ) : (
        <View style={styles.list}>
          {history.map((item) => (
            <RollCallHistoryRow
              item={item}
              key={item.id}
              onPress={() =>
                router.push(`/events/${eventId}/attendance/general/${item.id}` as never)
              }
              testID={`general-attendance-history-${item.id}`}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  list: { gap: spacing.md },
});
