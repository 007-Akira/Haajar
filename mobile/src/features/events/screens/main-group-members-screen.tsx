import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  MemberRow,
  PageHeader,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  TextField,
  type UserRole,
} from "@/components";
import { colors, layout, spacing, typography } from "@/theme";

import { getMockEventDetails } from "../data/mock-event-details";
import { getMockEventMembers } from "../data/mock-event-members";

type RoleFilter = "all" | UserRole;

const roleFilters: RoleFilter[] = ["all", "member", "co-organiser", "organiser", "super organiser"];

export function MainGroupMembersScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId: string; state?: string }>();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activityMessage, setActivityMessage] = useState("");
  const eventResult = getMockEventDetails(params.eventId);
  const membersResult = getMockEventMembers(params.eventId, params.state);
  const eventName = eventResult.status === "ready" ? eventResult.event.name : "Trip members";

  const filteredMembers = useMemo(() => {
    if (membersResult.status !== "ready") {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return membersResult.members.filter((member) => {
      const matchesQuery =
        !normalizedQuery ||
        member.name.toLowerCase().includes(normalizedQuery) ||
        member.phone.includes(normalizedQuery);
      const memberRole = member.eventRole ?? "member";
      const matchesRole = roleFilter === "all" || memberRole === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [membersResult, query, roleFilter]);

  function cycleRoleFilter(): void {
    const currentIndex = roleFilters.indexOf(roleFilter);
    const nextIndex = (currentIndex + 1) % roleFilters.length;
    setRoleFilter(roleFilters[nextIndex] ?? "all");
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="main-group-members-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to trip details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
          testID: "main-group-members-back-button",
        }}
        subtitle={eventName}
        title="Everyone"
      />

      {membersResult.status === "loading" ? (
        <View style={styles.loading}>
          <LoadingSkeleton lines={layout.skeletonDefaultLines} />
          <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        </View>
      ) : null}

      {membersResult.status === "error" ? (
        <EmptyState
          actionLabel="Go Back"
          description={membersResult.message}
          onActionPress={() => router.back()}
          testID="members-error-state"
          title="Roster unavailable"
        />
      ) : null}

      {membersResult.status === "ready" ? (
        <>
          <SectionHeader
            description="Every member belonging to this trip."
            title={`${membersResult.members.length} members`}
          />
          <View style={styles.filters}>
            <TextField
              label="Search members"
              onChangeText={setQuery}
              placeholder="Name or phone number"
              testID="member-search-field"
              value={query}
            />
            <SecondaryButton
              accessibilityLabel={`Filter by role. Current filter: ${roleFilter}`}
              fullWidth
              label={`Role: ${roleFilter}`}
              onPress={cycleRoleFilter}
              testID="member-role-filter"
            />
          </View>

          {activityMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
              {activityMessage}
            </Text>
          ) : null}

          {membersResult.members.length === 0 ? (
            <EmptyState
              description="Members added to this trip will appear in Everyone."
              testID="members-empty-state"
              title="No members yet"
            />
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              actionLabel="Clear Search"
              description="Try another name, phone number, or role."
              onActionPress={() => {
                setQuery("");
                setRoleFilter("all");
              }}
              testID="members-no-results"
              title="No matching members"
            />
          ) : (
            <View style={styles.memberList}>
              {filteredMembers.map((member) => (
                <MemberRow
                  internalGroupCount={member.internalGroupCount}
                  key={member.id}
                  name={member.name}
                  onCall={() => setActivityMessage(`Call action selected for ${member.name}.`)}
                  phone={member.phone}
                  role={member.eventRole}
                  testID={`event-member-${member.id}`}
                />
              ))}
            </View>
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  loading: {
    gap: spacing.xl,
  },
  filters: {
    gap: spacing.md,
  },
  activityMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  memberList: {
    gap: spacing.sm,
  },
});
