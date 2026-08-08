import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from "@/components";
import { useEvent } from "@/features/events/hooks/use-event";
import { useEventMemberCount } from "@/features/events/hooks/use-event-member-count";
import { useEventMembers } from "@/features/events/hooks/use-event-members";
import { useEventMembership } from "@/features/events/hooks/use-event-membership";
import { useSession } from "@/features/auth";
import { colors, layout, radii, spacing, typography } from "@/theme";

import type { GeneralOperatorInput } from "../api/general-attendance";
import {
  useActiveGeneralAttendance,
  useCreateGeneralAttendance,
} from "../hooks/use-general-attendance";

export function CreateGeneralAttendanceScreen(): JSX.Element {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const event = useEvent(eventId);
  const { user } = useSession();
  const membership = useEventMembership(eventId);
  const members = useEventMembers(eventId);
  const count = useEventMemberCount(eventId);
  const active = useActiveGeneralAttendance(eventId);
  const mutation = useCreateGeneralAttendance(eventId);
  const [operators, setOperators] = useState<Record<string, GeneralOperatorInput>>({});
  const [error, setError] = useState("");
  const activeId = active.data;
  useEffect(() => {
    if (activeId) router.replace(`/events/${eventId}/attendance/general/${activeId}`);
  }, [activeId, eventId, router]);
  const selected = useMemo(() => Object.values(operators), [operators]);
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if ([event, membership, members, count, active].some((query) => query.isLoading) || activeId)
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Start General Attendance" />
        <LoadingSkeleton lines={6} />
      </ScreenContainer>
    );
  if ([event, membership, members, count, active].some((query) => query.isError))
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Start General Attendance" />
        <EmptyState
          title="Could not prepare attendance"
          description="Check your connection and retry."
          actionLabel="Retry"
          onActionPress={() => {
            void event.refetch();
            void membership.refetch();
            void members.refetch();
            void count.refetch();
            void active.refetch();
          }}
        />
      </ScreenContainer>
    );
  if (
    !event.data ||
    event.data.status !== "active" ||
    membership.data?.status !== "active" ||
    membership.data.role !== "super_organiser"
  )
    return (
      <ScreenContainer showGrid testID="general-attendance-unauthorised">
        <PageHeader leadingAction={back} title="Start General Attendance" />
        <EmptyState
          title="Action unavailable"
          description={
            event.data?.status === "archived"
              ? "Archived trips cannot start attendance."
              : "Only the trip super organiser can start General attendance."
          }
        />
      </ScreenContainer>
    );

  function toggle(userId: string): void {
    setOperators((current) =>
      current[userId]
        ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== userId))
        : { ...current, [userId]: { userId, canScan: true, canMarkManually: false } }
    );
  }
  function toggleManual(userId: string): void {
    setOperators((current) => ({
      ...current,
      [userId]: { ...current[userId], canMarkManually: !current[userId].canMarkManually },
    }));
  }
  async function start(): Promise<void> {
    setError("");
    try {
      const sessionId = await mutation.create({ title: "General attendance", operators: selected });
      router.replace(`/events/${eventId}/attendance/general/${sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attendance could not be started safely.");
    }
  }
  return (
    <ScreenContainer
      scroll
      showGrid
      contentContainerStyle={styles.content}
      testID="create-general-attendance-screen"
    >
      <PageHeader
        leadingAction={back}
        subtitle={event.data.name}
        title="Start General Attendance"
      />
      <View style={styles.summary}>
        <Text style={styles.eyebrow}>[ EVENT-WIDE ROSTER ]</Text>
        <Text style={styles.count}>{count.data ?? 0}</Text>
        <Text style={styles.body}>
          active trip members will be snapshotted. General attendance has no subgroup or offline
          mode.
        </Text>
      </View>
      <SectionHeader
        title="Select volunteers"
        description={`${selected.length} selected · temporary permissions only`}
      />
      {(members.data ?? [])
        .filter((member) => member.userId !== user?.id)
        .map((member) => {
          const chosen = operators[member.userId];
          return (
            <View
              key={member.userId}
              style={styles.member}
              testID={`general-volunteer-${member.userId}`}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(chosen) }}
                onPress={() => toggle(member.userId)}
                style={styles.memberMain}
              >
                <Text style={styles.name}>{member.profile.full_name || "Member"}</Text>
                <Text style={styles.meta}>
                  {member.role.replaceAll("_", " ")} · {chosen ? "SCAN ALLOWED" : "NOT SELECTED"}
                </Text>
              </Pressable>
              {chosen ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: chosen.canMarkManually }}
                  onPress={() => toggleManual(member.userId)}
                  style={styles.permission}
                >
                  <Text style={styles.permissionText}>
                    {chosen.canMarkManually ? "MANUAL ON" : "MANUAL OFF"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        fullWidth
        highContrast
        label="Start General Attendance"
        loading={mutation.isPending}
        disabled={mutation.isPending || (count.data ?? 0) === 0}
        onPress={() => void start()}
        testID="start-general-attendance"
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
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: layout.borderWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  eyebrow: { ...typography.technicalLabel, color: colors.accent },
  count: { ...typography.displayLarge, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  member: {
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  memberMain: { minHeight: layout.minimumTouchTarget, justifyContent: "center" },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  meta: { ...typography.technicalLabel, color: colors.textSecondary },
  permission: {
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  permissionText: { ...typography.technicalLabel, color: colors.accent },
  error: { ...typography.body, color: colors.danger },
});
