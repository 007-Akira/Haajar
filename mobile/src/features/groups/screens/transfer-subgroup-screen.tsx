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
  SecondaryButton,
} from "@/components";
import { useEventGroups } from "@/features/events/hooks/use-event-groups";
import { useEventMembership } from "@/features/events/hooks/use-event-membership";
import { colors, layout, radii, spacing, typography } from "@/theme";
import { useGroup } from "../hooks/use-group";
import { useGroupMember } from "../hooks/use-group-member";
import { useTransferOperationalMembership } from "../hooks/use-transfer-operational-membership";

export function TransferSubgroupScreen(): JSX.Element {
  const { eventId, groupId, membershipId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
    membershipId: string;
  }>();
  const router = useRouter();
  const group = useGroup(groupId);
  const member = useGroupMember(groupId, membershipId);
  const actor = useEventMembership(eventId);
  const groups = useEventGroups(eventId);
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const mutation = useTransferOperationalMembership({
    eventId,
    categoryId: group.data?.parentGroupId ?? "",
    sourceGroupId: groupId,
    membershipId,
    affectedUserId: member.data?.userId ?? "",
  });
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if ([group, member, actor, groups].some((q) => q.isLoading))
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Transfer Subgroup" />
        <LoadingSkeleton lines={5} />
      </ScreenContainer>
    );
  const authorised = actor.data?.status === "active" && actor.data.role === "super_organiser";
  const siblings = (groups.data ?? []).filter(
    (item) =>
      item.groupKind === "operational" &&
      item.parentGroupId === group.data?.parentGroupId &&
      item.status === "active" &&
      item.id !== groupId
  );
  if (!authorised || group.data?.groupKind !== "operational" || member.data?.status !== "active")
    return (
      <ScreenContainer showGrid testID="transfer-subgroup-unauthorised">
        <PageHeader leadingAction={back} title="Transfer Subgroup" />
        <EmptyState
          title="Transfer unavailable"
          description="Only the trip super organiser can transfer an active operational-subgroup member."
        />
      </ScreenContainer>
    );
  async function submit() {
    if (!target || mutation.isPending) return;
    setError("");
    try {
      await mutation.transfer(target);
      router.back();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The transfer could not be completed safely."
      );
    }
  }
  return (
    <ScreenContainer
      scroll
      showGrid
      contentContainerStyle={styles.content}
      testID="transfer-subgroup-screen"
    >
      <PageHeader
        leadingAction={back}
        subtitle={group.data.eventName ?? "Trip"}
        title="Transfer Subgroup"
      />
      <View>
        <Text style={styles.name}>{member.data.profile?.full_name || "Member"}</Text>
        <Text style={styles.body}>
          {group.data.name} · {member.data.role.replaceAll("_", " ")}
        </Text>
      </View>
      <Text style={styles.warning}>
        Transferring moves this active membership atomically, rotates the member’s QR, and preserves
        all historical attendance snapshots.
      </Text>
      {siblings.map((item) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: target === item.id }}
          key={item.id}
          onPress={() => setTarget(item.id)}
          style={[styles.option, target === item.id && styles.selected]}
          testID={`transfer-target-${item.id}`}
        >
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.body}>{item.activeMemberCount} active members</Text>
        </Pressable>
      ))}
      {siblings.length === 0 ? (
        <EmptyState
          title="No available sibling subgroup"
          description="Create or activate another subgroup before transferring this member."
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        fullWidth
        label="Confirm Transfer"
        disabled={!target || mutation.isPending}
        loading={mutation.isPending}
        onPress={() => void submit()}
        testID="confirm-subgroup-transfer"
      />
      <SecondaryButton
        fullWidth
        label="Cancel"
        disabled={mutation.isPending}
        onPress={() => router.back()}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  warning: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  option: {
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: layout.minimumTouchTarget,
  },
  selected: { borderColor: colors.accent },
  error: { ...typography.body, color: colors.danger },
});
