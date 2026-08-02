import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, LoadingSkeleton, PageHeader, ScreenContainer } from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { appErrorCodes, isAppError } from "@/lib/errors";
import { colors, layout, spacing } from "@/theme";

import { RollCallHistoryRow } from "../components/roll-call-history-row";
import { useRollCallHistory } from "../hooks/use-roll-call-history";

export function RollCallHistoryScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const groupQuery = useGroup(groupId);
  const historyQuery = useRollCallHistory(groupId);
  const refreshing = groupQuery.isRefetching || historyQuery.isRefetching;

  async function refresh(): Promise<void> {
    await Promise.all([groupQuery.refetch(), historyQuery.refetch()]);
  }

  const header = (
    <PageHeader
      leadingAction={{
        accessibilityLabel: "Return to group details",
        icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
        onPress: () => router.back(),
      }}
      subtitle={groupQuery.data?.name}
      title="Roll Call History"
    />
  );

  if (groupQuery.isPending || historyQuery.isPending) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="roll-call-history-loading"
      >
        {header}
        <LoadingSkeleton lines={8} />
      </ScreenContainer>
    );
  }
  if (groupQuery.isError || historyQuery.isError) {
    const error = historyQuery.error ?? groupQuery.error;
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
              ? "You do not have permission to view this group's roll-call history."
              : "History could not be loaded. Check your connection and retry."
          }
          onActionPress={unauthorised ? undefined : () => void refresh()}
          testID={unauthorised ? "roll-call-history-unauthorised" : "roll-call-history-error"}
          title={unauthorised ? "History unavailable" : "Could not load history"}
        />
      </ScreenContainer>
    );
  }

  const group = groupQuery.data;
  const history = historyQuery.data ?? [];
  if (!group || group.eventId !== eventId) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid>
        {header}
        <EmptyState
          description="The selected group could not be found."
          title="History unavailable"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      scroll
      showGrid
      testID="roll-call-history-screen"
    >
      {header}
      {history.length === 0 ? (
        <EmptyState
          description="Closed and active roll calls will appear here."
          testID="roll-call-history-empty"
          title="No roll calls yet"
        />
      ) : (
        <View style={styles.list}>
          {history.map((item) => (
            <RollCallHistoryRow
              item={item}
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
                  params: { eventId, groupId, rollCallId: item.id },
                })
              }
              testID={`roll-call-history-${item.id}`}
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
