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
} from "@/components";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { openPhoneLink } from "@/lib/native/open-phone-link";
import { colors, layout, spacing, typography } from "@/theme";

import { useEvent } from "../hooks/use-event";
import { useEventMembers } from "../hooks/use-event-members";
import { useEventMembership } from "../hooks/use-event-membership";
import { toEventDisplayRole } from "../permissions/event-permissions";

type RoleFilter = "all" | "member" | "super organiser";

const roleFilters: RoleFilter[] = ["all", "member", "super organiser"];

export function MainGroupMembersScreen(): JSX.Element {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activityMessage, setActivityMessage] = useState("");
  const eventQuery = useEvent(eventId);
  const membershipQuery = useEventMembership(eventId);
  const membersQuery = useEventMembers(eventId);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return members.filter((member) => {
      const name = member.profile?.full_name ?? "";
      const phone = member.profile?.phone ?? "";
      const role = toEventDisplayRole(member.role);
      return (
        (!normalizedQuery ||
          name.toLowerCase().includes(normalizedQuery) ||
          phone.toLowerCase().includes(normalizedQuery)) &&
        (roleFilter === "all" || role === roleFilter)
      );
    });
  }, [members, query, roleFilter]);
  const isInitialLoading =
    eventQuery.isLoading ||
    membershipQuery.isLoading ||
    membershipQuery.sessionLoading ||
    (membershipQuery.data?.status === "active" && membersQuery.isLoading);
  const backAction = {
    accessibilityLabel: "Go back to trip details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "main-group-members-back-button",
  };

  function cycleRoleFilter(): void {
    const currentIndex = roleFilters.indexOf(roleFilter);
    setRoleFilter(roleFilters[(currentIndex + 1) % roleFilters.length] ?? "all");
  }

  async function callMember(name: string, phone: string | null): Promise<void> {
    try {
      const opened = await openPhoneLink(phone);
      if (!opened) setActivityMessage(`No phone number is available for ${name}.`);
    } catch {
      setActivityMessage(`Could not open the phone app for ${name}.`);
    }
  }

  if (isInitialLoading) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="main-group-members-loading"
      >
        <PageHeader leadingAction={backAction} title="Everyone" />
        <View style={styles.loading}>
          <LoadingSkeleton lines={layout.skeletonDefaultLines} />
          <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        </View>
      </ScreenContainer>
    );
  }

  const failedQuery = [eventQuery, membershipQuery, membersQuery].find((item) => item.isError);
  if (failedQuery) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="members-error">
        <PageHeader leadingAction={backAction} title="Everyone" />
        <EmptyState
          actionLabel="Retry"
          description={
            isAppError(failedQuery.error)
              ? failedQuery.error.message
              : userSafeErrorMessages.UNKNOWN_ERROR
          }
          onActionPress={() => {
            void eventQuery.refetch();
            void membershipQuery.refetch();
            void membersQuery.refetch();
          }}
          testID="members-error-state"
          title="Roster unavailable"
        />
      </ScreenContainer>
    );
  }

  if (
    membershipQuery.sessionMissing ||
    !membershipQuery.data ||
    membershipQuery.data.status !== "active"
  ) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="members-denied">
        <PageHeader leadingAction={backAction} title="Everyone" />
        <EmptyState
          actionLabel="Go Back"
          description="You need an active trip membership to view Everyone."
          onActionPress={() => router.back()}
          testID="members-denied-state"
          title="Access unavailable"
        />
      </ScreenContainer>
    );
  }

  const isRefreshing = [eventQuery, membershipQuery, membersQuery].some(
    (item) => item.isRefetching
  );

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      onRefresh={() => {
        void Promise.all([eventQuery.refetch(), membershipQuery.refetch(), membersQuery.refetch()]);
      }}
      refreshing={isRefreshing}
      scroll
      showGrid
      testID="main-group-members-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={eventQuery.data?.name ?? "Trip members"}
        title="Everyone"
      />

      <SectionHeader
        description="Every active member belonging to this trip."
        title={`${members.length} members`}
      />
      <View style={styles.filters}>
        <TextField
          accessibilityLabel="Search trip members by name or phone"
          label="Search members"
          onChangeText={setQuery}
          placeholder="Name or phone number"
          testID="member-search-field"
          value={query}
        />
        <SecondaryButton
          accessibilityLabel={`Filter by event role. Current filter: ${roleFilter}`}
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

      {members.length === 0 ? (
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
          {filteredMembers.map((member) => {
            const name = member.profile?.full_name?.trim() || "Unnamed member";
            return (
              <MemberRow
                internalGroupCount={member.internalGroupCount}
                key={member.membershipId}
                name={name}
                onCall={() => void callMember(name, member.profile?.phone ?? null)}
                phone={member.profile?.phone ?? "Phone unavailable"}
                role={toEventDisplayRole(member.role)}
                testID={`event-member-${member.membershipId}`}
              />
            );
          })}
        </View>
      )}
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
