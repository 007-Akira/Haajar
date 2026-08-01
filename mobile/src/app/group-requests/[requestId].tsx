import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  StatusBadge,
} from "@/components";
import { useUserGroups } from "@/features/groups/hooks/use-user-groups";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

export default function GroupRequestStatusRoute(): JSX.Element {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const overviewQuery = useUserGroups();
  const request = overviewQuery.data?.requests.find((item) => item.requestId === requestId);
  const backAction = {
    accessibilityLabel: "Go back to groups",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "group-request-status-back",
  };

  if (overviewQuery.isLoading) {
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={backAction} title="Request Status" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }
  if (overviewQuery.isError || !request) {
    return (
      <ScreenContainer showGrid testID="group-request-status-error">
        <PageHeader leadingAction={backAction} title="Request Status" />
        <EmptyState
          actionLabel={overviewQuery.isError ? "Retry" : "Go Back"}
          description={
            overviewQuery.isError && isAppError(overviewQuery.error)
              ? overviewQuery.error.message
              : overviewQuery.isError
                ? userSafeErrorMessages.UNKNOWN_ERROR
                : "This request is no longer available."
          }
          onActionPress={() =>
            overviewQuery.isError ? void overviewQuery.refetch() : router.back()
          }
          title={overviewQuery.isError ? "Could not load request" : "Request not found"}
        />
      </ScreenContainer>
    );
  }

  const activeGroup = overviewQuery.data?.activeGroups.find(
    (group) => group.groupId === request.groupId
  );
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void overviewQuery.refetch()}
      refreshing={overviewQuery.isRefetching}
      scroll
      showGrid
      testID="group-request-status-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={request.eventName}
        title={request.groupName}
      />
      <View style={styles.card}>
        {request.status === "pending" ? (
          <StatusBadge status="pending" />
        ) : (
          <Text
            style={[styles.status, request.status === "rejected" && styles.rejected]}
          >{`[ ${request.status.toUpperCase()} ]`}</Text>
        )}
        <Text style={styles.title}>
          {request.status === "pending"
            ? "Awaiting organiser review"
            : request.status === "accepted"
              ? "Request accepted"
              : "Request rejected"}
        </Text>
        <Text style={styles.body}>Submitted {new Date(request.submittedAt).toLocaleString()}</Text>
        {request.rejectionReason ? (
          <Text style={styles.body}>Reason: {request.rejectionReason}</Text>
        ) : null}
      </View>
      {activeGroup ? (
        <PrimaryButton
          accessibilityLabel={`Open ${activeGroup.groupName}`}
          fullWidth
          label="Open Group"
          onPress={() =>
            router.replace({
              pathname: "/events/[eventId]/groups/[groupId]",
              params: { eventId: activeGroup.eventId, groupId: activeGroup.groupId },
            })
          }
          testID="request-status-open-group"
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  status: { ...typography.technicalLabel, color: colors.success },
  rejected: { color: colors.danger },
  title: { ...typography.headingMedium, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
});
