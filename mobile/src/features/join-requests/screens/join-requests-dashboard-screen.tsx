import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SegmentedTabs,
  AnswerSummaryList,
  LabeledDetailRow,
  TextField,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupMembership } from "@/features/groups/hooks/use-group-membership";
import { appErrorCodes, isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme";

import { useGroupJoinRequests } from "../hooks/use-join-requests";
import { useReviewJoinRequest } from "../hooks/use-review-join-request";
import type {
  JoinRequest,
  JoinRequestDecision,
  JoinRequestStatus,
} from "../types/join-request-models";
import { canReviewJoinRequests, formatRegistrationAnswer } from "../types/join-request-models";

type DashboardStatus = Exclude<JoinRequestStatus, "cancelled">;
const tabs: { label: string; value: DashboardStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
];

function submittedTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Submission time unavailable" : date.toLocaleString();
}

export function JoinRequestsDashboardScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const [status, setStatus] = useState<DashboardStatus>("pending");
  const [selected, setSelected] = useState<JoinRequest | null>(null);
  const [decision, setDecision] = useState<JoinRequestDecision>("accept");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const requestsQuery = useGroupJoinRequests(groupId, status);
  const reviewMutation = useReviewJoinRequest();
  const role = membershipQuery.data?.role;
  const canManage = canReviewJoinRequests(role, membershipQuery.data?.status);
  const requests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);
  const visibleRequests = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return requests;
    return requests.filter((request) =>
      [request.applicant?.fullName, request.applicant?.phone, request.applicant?.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(value))
    );
  }, [requests, search]);
  const backAction = {
    accessibilityLabel: "Go back to group details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "join-requests-back-button",
  };

  function openConfirmation(request: JoinRequest, nextDecision: JoinRequestDecision): void {
    setSelected(request);
    setDecision(nextDecision);
    setRejectionReason("");
    setActionError(null);
  }

  async function confirmReview(): Promise<void> {
    if (!selected || reviewMutation.isPending || !groupQuery.data) return;
    setActionError(null);
    if (decision === "reject" && rejectionReason.trim().length > 500) {
      setActionError("Keep the rejection reason under 500 characters.");
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        requestId: selected.id,
        decision,
        rejectionReason: decision === "reject" ? rejectionReason : undefined,
        eventId: eventId ?? groupQuery.data.eventId,
        groupId: groupId!,
        applicantUserId: selected.userId,
      });
      setSelected(null);
    } catch (error) {
      setActionError(
        isAppError(error) && error.code === appErrorCodes.conflict
          ? "This request has already been reviewed. The list has been refreshed."
          : isAppError(error)
            ? error.message
            : userSafeErrorMessages.UNKNOWN_ERROR
      );
      void requestsQuery.refetch();
    }
  }

  if (groupQuery.isLoading || membershipQuery.isLoading || membershipQuery.sessionLoading) {
    return (
      <ScreenContainer scroll showGrid testID="join-requests-loading">
        <PageHeader leadingAction={backAction} title="Join Requests" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  if (!canManage) {
    return (
      <ScreenContainer showGrid testID="join-requests-permission-lost">
        <PageHeader leadingAction={backAction} title="Join Requests" />
        <EmptyState
          actionLabel="Go Back"
          description="Only an active group organiser or super organiser can review requests."
          onActionPress={() => router.back()}
          testID="join-requests-unauthorised-state"
          title="Permission unavailable"
        />
      </ScreenContainer>
    );
  }

  return (
    <>
      <ScreenContainer
        contentContainerStyle={styles.content}
        onRefresh={() => void requestsQuery.refetch()}
        refreshing={requestsQuery.isRefetching}
        scroll
        showGrid
        testID="join-requests-dashboard"
      >
        <PageHeader
          leadingAction={backAction}
          subtitle={groupQuery.data?.name ?? "Group"}
          title="Join Requests"
        />

        <SegmentedTabs
          accessibilityLabel="Filter join requests by status"
          onChange={setStatus}
          tabs={tabs}
          testID="join-request-tabs"
          value={status}
        />
        <TextField
          accessibilityLabel="Search join requests"
          label="Search applicants"
          onChangeText={setSearch}
          placeholder="Name, phone, or email"
          testID="join-requests-search"
          value={search}
        />

        {requestsQuery.isLoading ? (
          <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        ) : requestsQuery.isError ? (
          <EmptyState
            actionLabel="Retry"
            description={
              isAppError(requestsQuery.error)
                ? requestsQuery.error.message
                : userSafeErrorMessages.UNKNOWN_ERROR
            }
            onActionPress={() => void requestsQuery.refetch()}
            testID="join-requests-error-state"
            title={
              isAppError(requestsQuery.error) &&
              requestsQuery.error.code === appErrorCodes.permissionDenied
                ? "Permission unavailable"
                : "Could not load requests"
            }
          />
        ) : requests.length === 0 ? (
          <EmptyState
            description={`There are no ${status} join requests for this group.`}
            testID={`join-requests-empty-${status}`}
            title={`No ${status} requests`}
          />
        ) : (
          <View style={styles.list}>
            {visibleRequests.length === 0 ? (
              <EmptyState
                description="Try another name, phone, or email."
                title="No matching requests"
              />
            ) : (
              visibleRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  busy={reviewMutation.isPending && selected?.id === request.id}
                  onAccept={() => openConfirmation(request, "accept")}
                  onReject={() => openConfirmation(request, "reject")}
                  request={request}
                  showActions={status === "pending"}
                />
              ))
            )}
          </View>
        )}
      </ScreenContainer>

      <Modal
        animationType="fade"
        onRequestClose={() => !reviewMutation.isPending && setSelected(null)}
        transparent
        visible={Boolean(selected)}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityLabel={`${decision === "accept" ? "Accept" : "Reject"} join request confirmation`}
            accessibilityRole="alert"
            style={styles.dialog}
            testID="review-request-confirmation-dialog"
          >
            <Text style={styles.dialogTitle}>
              {decision === "accept" ? "Accept request?" : "Reject request?"}
            </Text>
            <Text style={styles.dialogCopy}>
              {decision === "accept"
                ? `${selected?.applicant?.fullName ?? "This applicant"} will become an active event and group member.`
                : `${selected?.applicant?.fullName ?? "This applicant"} will not receive a membership.`}
            </Text>
            {selected ? (
              <>
                <LabeledDetailRow
                  label="Phone"
                  value={selected.applicant?.phone ?? "Not provided"}
                />
                <LabeledDetailRow
                  label="Google email"
                  value={selected.applicant?.email ?? "Not available"}
                />
                <AnswerSummaryList answers={selected.displayAnswers ?? []} />
              </>
            ) : null}
            {decision === "reject" ? (
              <TextField
                accessibilityLabel="Optional rejection reason"
                label="Reason"
                maxLength={500}
                multiline
                onChangeText={setRejectionReason}
                placeholder="Optional reason"
                testID="rejection-reason-field"
                value={rejectionReason}
              />
            ) : null}
            {actionError ? (
              <Text
                accessibilityRole="alert"
                style={styles.errorText}
                testID="review-request-error"
              >
                {actionError}
              </Text>
            ) : null}
            <PrimaryButton
              accessibilityLabel={`Confirm ${decision} join request`}
              disabled={reviewMutation.isPending}
              fullWidth
              label={decision === "accept" ? "Confirm Accept" : "Confirm Reject"}
              loading={reviewMutation.isPending}
              onPress={() => void confirmReview()}
              testID="confirm-review-request"
            />
            <SecondaryButton
              accessibilityLabel="Cancel request review"
              disabled={reviewMutation.isPending}
              fullWidth
              label="Cancel"
              onPress={() => setSelected(null)}
              testID="cancel-review-request"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

interface RequestCardProps {
  request: JoinRequest;
  showActions: boolean;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function RequestCard({ request, showActions, busy, onAccept, onReject }: RequestCardProps) {
  const applicant = request.applicant;
  return (
    <View style={styles.card} testID={`join-request-card-${request.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIdentity}>
          <Text style={styles.name}>{applicant?.fullName ?? "Unnamed applicant"}</Text>
          <Text style={styles.submitted}>{submittedTime(request.submittedAt)}</Text>
        </View>
        <Text style={styles.status}>{`[ ${request.status.toUpperCase()} ]`}</Text>
      </View>

      <View style={styles.profileFields}>
        <Text style={styles.sectionLabel}>[ VERIFIED PROFILE ]</Text>
        <Detail label="Phone" value={applicant?.phone ?? "Not provided"} />
        <Detail label="Google email" value={applicant?.email ?? "Not available"} />
      </View>

      <View style={styles.answers}>
        <Text style={styles.sectionLabel}>[ REGISTRATION ANSWERS ]</Text>
        {request.displayAnswers?.length ? (
          request.displayAnswers.map((answer) => (
            <Detail
              key={answer.id}
              label={answer.label}
              value={formatRegistrationAnswer(answer.answer)}
            />
          ))
        ) : (
          <Text style={styles.muted}>No custom answers were required.</Text>
        )}
      </View>

      {request.rejectionReason ? (
        <Detail label="Rejection reason" value={request.rejectionReason} />
      ) : null}
      {showActions ? (
        <View style={styles.actions}>
          <PrimaryButton
            accessibilityLabel={`Accept ${applicant?.fullName ?? "applicant"}`}
            disabled={busy}
            fullWidth
            label="Accept"
            onPress={onAccept}
            testID={`accept-request-${request.id}`}
          />
          <SecondaryButton
            accessibilityLabel={`Reject ${applicant?.fullName ?? "applicant"}`}
            disabled={busy}
            fullWidth
            label="Reject"
            onPress={onReject}
            testID={`reject-request-${request.id}`}
          />
        </View>
      ) : null}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  tabs: { flexDirection: "row", gap: spacing.xs },
  tab: {
    flex: 1,
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  selectedTab: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  tabText: { ...typography.technicalLabel, color: colors.textPrimary },
  selectedTabText: { color: colors.background },
  list: { gap: spacing.lg },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.hardSmall,
  },
  cardHeader: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  cardIdentity: { flex: 1, gap: spacing.xs },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  submitted: { ...typography.caption, color: colors.textSecondary },
  status: { ...typography.technicalLabel, color: colors.accent },
  profileFields: { gap: spacing.sm },
  answers: { gap: spacing.sm },
  sectionLabel: { ...typography.technicalLabel, color: colors.textPrimary },
  detail: { gap: spacing.xs },
  detailLabel: { ...typography.caption, color: colors.textSecondary },
  detailValue: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  muted: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.sm },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.scrim,
  },
  dialog: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    ...shadows.hardMedium,
  },
  dialogTitle: { ...typography.headingMedium, color: colors.textPrimary },
  dialogCopy: { ...typography.body, color: colors.textSecondary },
  errorText: { ...typography.body, color: colors.danger },
});
