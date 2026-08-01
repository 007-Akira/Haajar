import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AnswerSummaryList,
  EmptyState,
  InitialsBadge,
  LabeledDetailRow,
  LoadingSkeleton,
  PageHeader,
  RoleBadge,
  ScreenContainer,
  SectionHeader,
  SecondaryButton,
} from "@/components";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { openPhoneLink } from "@/lib/native/open-phone-link";
import { colors, layout, radii, spacing, typography } from "@/theme";
import { useEvent } from "../hooks/use-event";
import { useEventMemberDetail } from "../hooks/use-event-member-detail";
import { toEventDisplayRole, toGroupDisplayRole } from "../permissions/event-permissions";

export function TripMemberDetailsScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, userId } = useLocalSearchParams<{ eventId: string; userId: string }>();
  const eventQuery = useEvent(eventId);
  const detailQuery = useEventMemberDetail(eventId, userId);
  const backAction = {
    accessibilityLabel: "Go back to trip members",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "member-details-back",
  };
  if (eventQuery.isLoading || detailQuery.isLoading)
    return (
      <ScreenContainer scroll showGrid testID="member-details-loading">
        <PageHeader leadingAction={backAction} title="Member Details" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  if (eventQuery.isError || detailQuery.isError || !detailQuery.data) {
    const error = eventQuery.error ?? detailQuery.error;
    return (
      <ScreenContainer showGrid testID="member-details-error">
        <PageHeader leadingAction={backAction} title="Member Details" />
        <EmptyState
          actionLabel="Retry"
          description={isAppError(error) ? error.message : userSafeErrorMessages.UNKNOWN_ERROR}
          onActionPress={() => {
            void eventQuery.refetch();
            void detailQuery.refetch();
          }}
          title="Member details unavailable"
        />
      </ScreenContainer>
    );
  }
  const member = detailQuery.data;
  const joined = new Date(member.joinedAt);
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void detailQuery.refetch()}
      refreshing={detailQuery.isRefetching}
      scroll
      showGrid
      testID="trip-member-details-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={eventQuery.data?.name ?? "Trip"}
        title="Member Details"
      />
      <View style={styles.profileCard}>
        <InitialsBadge name={member.fullName} />
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{member.fullName}</Text>
          <RoleBadge role={toEventDisplayRole(member.eventRole)} />
          <Text
            style={styles.joined}
          >{`Joined ${Number.isNaN(joined.getTime()) ? "date unavailable" : joined.toLocaleDateString()}`}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <LabeledDetailRow label="Phone" value={member.phone ?? "Not provided"} />
        {member.email ? (
          <LabeledDetailRow label="Verified Google email" value={member.email} />
        ) : null}
        {member.phone ? (
          <SecondaryButton
            accessibilityLabel={`Call ${member.fullName}`}
            fullWidth
            label="Call Member"
            onPress={() => void openPhoneLink(member.phone)}
            testID="member-details-call"
          />
        ) : null}
      </View>
      <View style={styles.section}>
        <SectionHeader description="Internal memberships visible to your role." title="Groups" />
        {member.memberships.length ? (
          member.memberships.map((membership) => (
            <View key={membership.membershipId} style={styles.membership}>
              <Text style={styles.groupName}>{membership.groupName}</Text>
              <RoleBadge role={toGroupDisplayRole(membership.role)} />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No internal group memberships are visible.</Text>
        )}
      </View>
      <View style={styles.section}>
        <SectionHeader
          description="Read-only answers visible under current permissions."
          title="Registration Answers"
        />
        <AnswerSummaryList
          answers={member.answers.map((answer) => ({
            id: answer.id,
            label: `${answer.groupName} · ${answer.label}`,
            answer: answer.answer,
          }))}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  profileCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  profileCopy: { flex: 1, alignItems: "flex-start", gap: spacing.xs },
  name: { ...typography.headingMedium, color: colors.textPrimary },
  joined: { ...typography.caption, color: colors.textSecondary },
  details: { gap: spacing.md },
  section: { gap: spacing.md },
  membership: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  groupName: { ...typography.bodyMedium, flex: 1, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary },
});
