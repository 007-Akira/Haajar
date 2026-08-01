import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AnswerSummaryList,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatusBadge,
} from "@/components";
import { useJoinRequestStatusDetail } from "@/features/join-requests/hooks/use-join-requests";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

export default function GroupRequestStatusRoute(): JSX.Element {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const requestQuery = useJoinRequestStatusDetail(requestId);
  const backAction = {
    accessibilityLabel: "Go back to groups",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "group-request-status-back",
  };
  if (requestQuery.isLoading)
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={backAction} title="Application Status" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  if (requestQuery.isError || !requestQuery.data)
    return (
      <ScreenContainer showGrid testID="group-request-status-error">
        <PageHeader leadingAction={backAction} title="Application Status" />
        <EmptyState
          actionLabel="Retry"
          description={
            isAppError(requestQuery.error)
              ? requestQuery.error.message
              : userSafeErrorMessages.UNKNOWN_ERROR
          }
          onActionPress={() => void requestQuery.refetch()}
          title="Could not load application"
        />
      </ScreenContainer>
    );
  const request = requestQuery.data;
  const submitted = new Date(request.submittedAt);
  const accepted = request.status === "accepted";
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void requestQuery.refetch()}
      refreshing={requestQuery.isRefetching}
      scroll
      showGrid
      testID="group-request-status-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={`${request.groupName} · ${request.eventName}`}
        title="Application Status"
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
            ? "Waiting for organiser approval"
            : accepted
              ? "You are now a member"
              : "Application not approved"}
        </Text>
        <Text
          style={styles.body}
        >{`Submitted ${Number.isNaN(submitted.getTime()) ? "time unavailable" : submitted.toLocaleString()}`}</Text>
        {request.rejectionReason ? (
          <Text style={styles.body}>Reason: {request.rejectionReason}</Text>
        ) : null}
      </View>
      <View style={styles.section}>
        <SectionHeader
          description="The answers sent with this application."
          title="Submitted Answers"
        />
        <AnswerSummaryList answers={request.answers} />
      </View>
      {accepted ? (
        <View style={styles.actions}>
          <PrimaryButton
            accessibilityLabel={`Open ${request.groupName}`}
            fullWidth
            label="Open Group"
            onPress={() =>
              router.replace({
                pathname: "/events/[eventId]/groups/[groupId]",
                params: { eventId: request.eventId, groupId: request.groupId },
              })
            }
            testID="request-status-open-group"
          />
          <PrimaryButton
            accessibilityLabel={`Show ${request.groupName} QR`}
            fullWidth
            label="Show My QR"
            onPress={() =>
              router.push({
                pathname: "/events/[eventId]/groups/[groupId]/qr",
                params: { eventId: request.eventId, groupId: request.groupId },
              })
            }
            testID="request-status-open-qr"
          />
        </View>
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
  section: { gap: spacing.md },
  actions: { gap: spacing.sm },
});
