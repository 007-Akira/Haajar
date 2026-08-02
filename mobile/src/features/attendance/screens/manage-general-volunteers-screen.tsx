import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  ScreenContainer,
  SecondaryButton,
} from "@/components";
import { useEventMembers } from "@/features/events/hooks/use-event-members";
import { useEventMembership } from "@/features/events/hooks/use-event-membership";
import { colors, layout, spacing, typography } from "@/theme";
import { useGeneralOperators, useSetGeneralOperator } from "../hooks/use-general-attendance";
export function ManageGeneralVolunteersScreen(): JSX.Element {
  const { eventId, sessionId } = useLocalSearchParams<{ eventId: string; sessionId: string }>();
  const router = useRouter();
  const actor = useEventMembership(eventId);
  const members = useEventMembers(eventId);
  const operators = useGeneralOperators(sessionId);
  const mutation = useSetGeneralOperator(sessionId);
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if ([actor, members, operators].some((q) => q.isLoading))
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Manage Volunteers" />
        <LoadingSkeleton lines={6} />
      </ScreenContainer>
    );
  if (actor.data?.status !== "active" || actor.data.role !== "super_organiser")
    return (
      <ScreenContainer showGrid>
        <PageHeader leadingAction={back} title="Manage Volunteers" />
        <EmptyState
          title="Permission required"
          description="Only the trip super organiser can change temporary operators."
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer scroll showGrid contentContainerStyle={styles.content}>
      <PageHeader leadingAction={back} title="Manage Volunteers" />
      {(members.data ?? []).map((member) => {
        const current = operators.data?.find((o) => o.userId === member.userId);
        return (
          <View key={member.userId} style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.name}>{member.profile.full_name || "Member"}</Text>
              <Text style={styles.meta}>
                {current
                  ? `SCAN ${current.canScan ? "ON" : "OFF"} · MANUAL ${current.canMarkManually ? "ON" : "OFF"}`
                  : "NOT ASSIGNED"}
              </Text>
            </View>
            <SecondaryButton
              label={current ? "Remove" : "Add"}
              disabled={mutation.isPending}
              onPress={() =>
                mutation.mutate({
                  userId: member.userId,
                  canScan: !current,
                  canMarkManually: false,
                })
              }
            />
            {current ? (
              <SecondaryButton
                label="Toggle Manual"
                disabled={mutation.isPending}
                onPress={() =>
                  mutation.mutate({ ...current, canMarkManually: !current.canMarkManually })
                }
              />
            ) : null}
          </View>
        );
      })}
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.md },
  row: { gap: spacing.sm },
  copy: { gap: spacing.xs },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  meta: { ...typography.technicalLabel, color: colors.textSecondary },
});
