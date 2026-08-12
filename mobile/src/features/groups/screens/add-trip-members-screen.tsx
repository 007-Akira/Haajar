import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  TextField,
  useAppDialog,
} from "@/components";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";
import { useGroup } from "../hooks/use-group";
import { useGroupAccess } from "../hooks/use-group-access";
import { useGroupMembership } from "../hooks/use-group-membership";
import {
  useAssignEventMemberToOperationalGroup,
  useOperationalGroupAssignmentCandidates,
} from "../hooks/use-operational-group-assignment";

export function AddTripMembersScreen(): JSX.Element {
  const { eventId, groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const router = useRouter();
  const dialog = useAppDialog();
  const [search, setSearch] = useState("");
  const groupQuery = useGroup(groupId);
  const accessQuery = useGroupAccess(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const canManage =
    accessQuery.data === "event_admin" ||
    (membershipQuery.data?.status === "active" && membershipQuery.data.role === "organiser");
  const candidatesQuery = useOperationalGroupAssignmentCandidates(groupId, canManage);
  const assignment = useAssignEventMemberToOperationalGroup({
    eventId,
    groupId,
  });
  const backAction = {
    accessibilityLabel: "Go back to members",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "add-trip-members-back",
  };
  if (
    groupQuery.isLoading ||
    accessQuery.isLoading ||
    membershipQuery.isLoading ||
    (canManage && candidatesQuery.isLoading)
  )
    return (
      <ScreenContainer scroll showGrid>
        <PageHeader leadingAction={backAction} title="Add Trip Members" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  const error =
    groupQuery.error ?? accessQuery.error ?? membershipQuery.error ?? candidatesQuery.error;
  if (error)
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={backAction} title="Add Trip Members" />
        <EmptyState
          title="Could not load trip members"
          description={isAppError(error) ? error.message : userSafeErrorMessages.UNKNOWN_ERROR}
          actionLabel="Retry"
          onActionPress={() => void candidatesQuery.refetch()}
        />
      </ScreenContainer>
    );
  if (!canManage || groupQuery.data?.groupKind !== "operational")
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={backAction} title="Add Trip Members" />
        <EmptyState
          title="Action unavailable"
          description="Only the event super organiser or this subgroup's organiser can assign trip members."
          actionLabel="Go Back"
          onActionPress={() => router.back()}
        />
      </ScreenContainer>
    );
  const normalized = search.trim().toLowerCase();
  const candidates = (candidatesQuery.data ?? []).filter(
    (c) =>
      !normalized ||
      (c.fullName ?? "").toLowerCase().includes(normalized) ||
      (c.phone ?? "").includes(normalized)
  );
  async function assign(
    userId: string,
    name: string,
    siblingName: string | null,
    siblingGroupId: string | null,
    siblingMembershipId: string | null
  ) {
    if (siblingName && siblingGroupId && siblingMembershipId) {
      dialog.alert(
        "Transfer required",
        `Already assigned to ${siblingName}. Transfer the member instead.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Transfer Member",
            onPress: () =>
              router.push({
                pathname:
                  "/events/[eventId]/groups/[groupId]/members/[membershipId]/transfer" as never,
                params: { eventId, groupId: siblingGroupId, membershipId: siblingMembershipId },
              }),
          },
        ]
      );
      return;
    }
    const result = await assignment.mutateAsync(userId);
    if (result === "assigned") dialog.alert("Member assigned", `${name} was added as a member.`);
    else if (result === "sibling_membership_exists")
      dialog.alert(
        "Transfer required",
        "Already assigned to another subgroup in this category. Transfer the member instead."
      );
    else dialog.alert("Member not assigned", result.replaceAll("_", " "));
  }
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="add-trip-members-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={groupQuery.data.name}
        title="Add Trip Members"
      />
      <Text style={styles.help}>
        Assign existing active trip members. Inviting people who have not joined the trip remains a
        separate flow.
      </Text>
      <TextField
        label="Search"
        placeholder="Name or phone"
        value={search}
        onChangeText={setSearch}
        testID="assignment-search"
      />
      {candidates.length === 0 ? (
        <EmptyState
          title="No eligible trip members"
          description="Everyone is already assigned here or no active trip members match your search."
        />
      ) : (
        <View style={styles.list}>
          {candidates.map((candidate) => {
            const name = candidate.fullName?.trim() || "Unnamed member";
            return (
              <Pressable
                key={candidate.userId}
                accessibilityRole="button"
                onPress={() =>
                  void assign(
                    candidate.userId,
                    name,
                    candidate.siblingGroupName,
                    candidate.siblingGroupId,
                    candidate.siblingMembershipId
                  )
                }
                style={styles.row}
                testID={`assignment-candidate-${candidate.userId}`}
              >
                <View style={styles.copy}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.meta}>
                    {candidate.siblingGroupName
                      ? `Assigned to ${candidate.siblingGroupName} · Transfer required`
                      : (candidate.phone ?? "Phone unavailable")}
                  </Text>
                </View>
                <PrimaryButton
                  label={candidate.siblingGroupName ? "Transfer" : "Add"}
                  disabled={assignment.isPending}
                  onPress={() =>
                    void assign(
                      candidate.userId,
                      name,
                      candidate.siblingGroupName,
                      candidate.siblingGroupId,
                      candidate.siblingMembershipId
                    )
                  }
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  help: { ...typography.body, color: colors.textSecondary },
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  copy: { flex: 1, gap: spacing.half },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
});
