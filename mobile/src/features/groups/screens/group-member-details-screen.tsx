import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  InitialsBadge,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  RoleBadge,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from "@/components";
import { useSession } from "@/features/auth";
import { useEventMembership } from "@/features/events/hooks/use-event-membership";
import { toGroupDisplayRole } from "@/features/events/permissions/event-permissions";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import {
  canSubmitRoleChange,
  getRoleManagementPolicy,
  groupRoleLabel,
  type AssignableGroupRole,
} from "../config/role-management";
import { useChangeGroupMemberRole } from "../hooks/use-change-group-member-role";
import { useGroup } from "../hooks/use-group";
import { useGroupMember } from "../hooks/use-group-member";
import { useGroupMembership } from "../hooks/use-group-membership";

export function GroupMemberDetailsScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId, membershipId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    membershipId: string;
  }>();
  const { user } = useSession();
  const groupQuery = useGroup(groupId);
  const actorMembershipQuery = useGroupMembership(groupId);
  const eventMembershipQuery = useEventMembership(eventId);
  const memberQuery = useGroupMember(groupId, membershipId);
  const roleMutation = useChangeGroupMemberRole();
  const [selectedRole, setSelectedRole] = useState<AssignableGroupRole | null>(null);
  const [successfulRole, setSuccessfulRole] = useState<AssignableGroupRole | null>(null);
  const backAction = {
    accessibilityLabel: "Go back to group members",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "group-member-details-back",
  };

  const loading =
    groupQuery.isLoading ||
    actorMembershipQuery.isLoading ||
    eventMembershipQuery.isLoading ||
    memberQuery.isLoading;
  if (loading) {
    return (
      <ScreenContainer scroll showGrid testID="group-member-details-loading">
        <PageHeader leadingAction={backAction} title="Member Details" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  const failedQuery = [groupQuery, actorMembershipQuery, eventMembershipQuery, memberQuery].find(
    (query) => query.isError
  );
  if (failedQuery) {
    return (
      <ScreenContainer showGrid testID="group-member-details-error">
        <PageHeader leadingAction={backAction} title="Member Details" />
        <EmptyState
          actionLabel="Retry"
          description={
            isAppError(failedQuery.error)
              ? failedQuery.error.message
              : userSafeErrorMessages.UNKNOWN_ERROR
          }
          onActionPress={() => {
            void groupQuery.refetch();
            void actorMembershipQuery.refetch();
            void eventMembershipQuery.refetch();
            void memberQuery.refetch();
          }}
          title="Could not load member"
        />
      </ScreenContainer>
    );
  }

  const group = groupQuery.data;
  const actorMembership = actorMembershipQuery.data;
  const eventMembership = eventMembershipQuery.data;
  const member = memberQuery.data;
  if (!group || !member || actorMembership?.status !== "active") {
    return (
      <ScreenContainer showGrid testID="group-member-details-unavailable">
        <PageHeader leadingAction={backAction} title="Member Details" />
        <EmptyState
          actionLabel="Go Back"
          description="This member is unavailable or you do not have access to this group."
          onActionPress={() => router.back()}
          title="Access unavailable"
        />
      </ScreenContainer>
    );
  }

  const policy = getRoleManagementPolicy({
    actorRole: actorMembership.role,
    actorStatus: actorMembership.status,
    actorUserId: user?.id ?? null,
    actorIsEventSuperOrganiser:
      eventMembership?.status === "active" && eventMembership.role === "super_organiser",
    groupStatus: group.status,
    eventStatus: group.eventStatus,
    targetRole: member.role,
    targetStatus: member.status,
    targetUserId: member.userId,
  });
  const displayedRole = successfulRole ?? member.role;
  const canSubmit = canSubmitRoleChange(policy, member.role, selectedRole, roleMutation.isPending);
  const memberName = member.profile?.full_name?.trim() || "Unnamed member";
  const selectedMembershipId = member.membershipId;
  const selectedMemberUserId = member.userId;
  const selectedGroupId = group.id;
  const mutationMessage = roleMutation.isError
    ? isAppError(roleMutation.error)
      ? roleMutation.error.message
      : userSafeErrorMessages.UNKNOWN_ERROR
    : null;

  async function confirmRoleChange(): Promise<void> {
    if (!selectedRole || !canSubmit) return;
    const nextRole = selectedRole;
    try {
      await roleMutation.mutateAsync({
        membershipId: selectedMembershipId,
        role: nextRole,
        groupId: selectedGroupId,
        affectedUserId: selectedMemberUserId,
      });
      setSuccessfulRole(nextRole);
      setSelectedRole(null);
    } catch {
      // The canonical mutation error is rendered below without sensitive backend details.
    }
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="group-member-details-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={`${group.name} · ${group.eventName ?? "Trip"}`}
        title="Member Details"
      />

      <View style={styles.memberCard} testID="selected-member-summary">
        <InitialsBadge name={memberName} />
        <View style={styles.memberCopy}>
          <Text style={styles.memberName}>{memberName}</Text>
          {member.profile?.phone ? <Text style={styles.body}>{member.profile.phone}</Text> : null}
          <RoleBadge role={toGroupDisplayRole(displayedRole)} />
          <Text style={styles.technical}>{`[ ${member.status.toUpperCase()} MEMBERSHIP ]`}</Text>
        </View>
      </View>

      {group.groupKind === "operational" &&
      group.parentGroupId &&
      eventMembership?.status === "active" &&
      eventMembership.role === "super_organiser" &&
      member.status === "active" ? (
        <SecondaryButton
          fullWidth
          label="Transfer Subgroup"
          onPress={() =>
            router.push(`/events/${eventId}/groups/${groupId}/members/${membershipId}/transfer`)
          }
          testID="transfer-subgroup-action"
        />
      ) : null}

      {successfulRole ? (
        <View accessibilityRole="alert" style={styles.successCard} testID="role-change-success">
          <Text style={styles.sectionTitle}>Role updated</Text>
          <Text style={styles.body}>
            {`${memberName} is now ${groupRoleLabel(successfulRole)}. The previous QR credential is no longer valid. The member must use the newly issued QR.`}
          </Text>
          <SecondaryButton
            accessibilityLabel="Return to group members"
            fullWidth
            label="Done"
            onPress={() => router.back()}
            testID="role-change-done"
          />
        </View>
      ) : policy.visible ? (
        <View style={styles.roleSection} testID="role-management-section">
          <SectionHeader
            description="Choose the member’s responsibilities in this group."
            title="Change Role"
          />
          {policy.blockedReason ? (
            <View accessibilityRole="alert" style={styles.blockedCard} testID="role-change-blocked">
              <Text style={styles.blockedLabel}>[ ROLE CHANGE UNAVAILABLE ]</Text>
              <Text style={styles.body}>{policy.blockedReason}</Text>
            </View>
          ) : (
            <>
              <View accessibilityRole="radiogroup" style={styles.roleOptions}>
                {policy.allowedRoles.map((role) => {
                  const isCurrent = role === member.role;
                  const selected = role === selectedRole;
                  return (
                    <Pressable
                      accessibilityLabel={`${groupRoleLabel(role)}${isCurrent ? ", current role" : ""}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected || (isCurrent && !selectedRole) }}
                      key={role}
                      onPress={() => {
                        roleMutation.reset();
                        setSelectedRole(role);
                      }}
                      style={({ pressed }) => [
                        styles.roleOption,
                        (selected || (isCurrent && !selectedRole)) && styles.roleOptionSelected,
                        pressed && styles.roleOptionPressed,
                      ]}
                      testID={`role-option-${role}`}
                    >
                      <Text style={styles.roleOptionTitle}>{groupRoleLabel(role)}</Text>
                      <Text style={styles.technical}>
                        {isCurrent ? "CURRENT ROLE" : "SELECT ROLE"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>QR credential replacement</Text>
                <Text style={styles.body}>
                  Changing this role immediately invalidates the member’s previous QR. A replacement
                  is issued securely to the member and is never shown to the organiser.
                </Text>
              </View>
              {selectedRole === member.role ? (
                <Text
                  accessibilityRole="alert"
                  style={styles.errorText}
                  testID="role-no-op-message"
                >
                  Select a different role to continue.
                </Text>
              ) : null}
              {mutationMessage ? (
                <Text accessibilityRole="alert" style={styles.errorText} testID="role-change-error">
                  {mutationMessage}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <SecondaryButton
                  accessibilityLabel="Cancel role change"
                  fullWidth
                  label="Cancel"
                  onPress={() => router.back()}
                  testID="role-change-cancel"
                />
                <PrimaryButton
                  accessibilityLabel="Confirm role change"
                  disabled={!canSubmit}
                  fullWidth
                  label="Confirm Role Change"
                  loading={roleMutation.isPending}
                  onPress={() => void confirmRoleChange()}
                  testID="role-change-confirm"
                />
              </View>
            </>
          )}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  memberCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  memberCopy: { flex: 1, alignItems: "flex-start", gap: spacing.xs },
  memberName: { ...typography.headingMedium, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  technical: { ...typography.technicalLabel, color: colors.textSecondary },
  roleSection: { gap: spacing.md },
  roleOptions: { gap: spacing.sm },
  roleOption: {
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    gap: spacing.half,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  roleOptionSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  roleOptionPressed: { backgroundColor: colors.gridLine },
  roleOptionTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  warningCard: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  warningTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  blockedCard: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.gridLine,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  blockedLabel: { ...typography.technicalLabel, color: colors.textPrimary },
  successCard: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  sectionTitle: { ...typography.headingSmall, color: colors.textPrimary },
  errorText: { ...typography.caption, color: colors.danger },
  actions: { gap: spacing.sm },
});
