import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  EmptyState,
  LoadingSkeleton,
  MemberRow,
  PageHeader,
  ScreenContainer,
  SectionHeader,
  SegmentedTabs,
  TextField,
  type UserRole,
} from "@/components";
import { toGroupDisplayRole } from "@/features/events/permissions/event-permissions";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { openPhoneLink } from "@/lib/native/open-phone-link";
import { colors, layout, spacing } from "@/theme";
import { useGroup } from "../hooks/use-group";
import { useGroupMembers } from "../hooks/use-group-members";
import { useGroupMembership } from "../hooks/use-group-membership";

type Filter = "all" | UserRole;
const tabs: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Members", value: "member" },
  { label: "Co-org", value: "co-organiser" },
  { label: "Organisers", value: "organiser" },
  { label: "Super", value: "super organiser" },
];

export function GroupMembersScreen(): JSX.Element {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const membersQuery = useGroupMembers(groupId);
  const backAction = {
    accessibilityLabel: "Go back to group",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "group-members-back",
  };
  if (groupQuery.isLoading || membershipQuery.isLoading || membersQuery.isLoading)
    return (
      <ScreenContainer scroll showGrid testID="group-members-loading">
        <PageHeader leadingAction={backAction} title="Members" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  if (groupQuery.isError || membershipQuery.isError || membersQuery.isError) {
    const error = groupQuery.error ?? membershipQuery.error ?? membersQuery.error;
    return (
      <ScreenContainer showGrid testID="group-members-error">
        <PageHeader leadingAction={backAction} title="Members" />
        <EmptyState
          actionLabel="Retry"
          description={isAppError(error) ? error.message : userSafeErrorMessages.UNKNOWN_ERROR}
          onActionPress={() => {
            void groupQuery.refetch();
            void membershipQuery.refetch();
            void membersQuery.refetch();
          }}
          title="Could not load members"
        />
      </ScreenContainer>
    );
  }
  if (membershipQuery.data?.status !== "active")
    return (
      <ScreenContainer showGrid testID="group-members-unauthorised">
        <PageHeader leadingAction={backAction} title="Members" />
        <EmptyState
          actionLabel="Go Back"
          description="An active group membership is required."
          onActionPress={() => router.back()}
          title="Access unavailable"
        />
      </ScreenContainer>
    );
  const members = membersQuery.data ?? [];
  const query = search.trim().toLowerCase();
  const filtered = members.filter((member) => {
    const name = member.profile?.full_name ?? "";
    const phone = member.profile?.phone ?? "";
    const role = toGroupDisplayRole(member.role);
    return (
      (!query || name.toLowerCase().includes(query) || phone.includes(query)) &&
      (filter === "all" || role === filter)
    );
  });
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void membersQuery.refetch()}
      refreshing={membersQuery.isRefetching}
      scroll
      showGrid
      testID="group-members-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={`${groupQuery.data?.name ?? "Group"} · ${members.length}`}
        title="Members"
      />
      <TextField
        accessibilityLabel="Search group members"
        label="Search"
        onChangeText={setSearch}
        placeholder="Name or phone"
        testID="group-members-search"
        value={search}
      />
      <SegmentedTabs
        accessibilityLabel="Filter members by role"
        onChange={setFilter}
        tabs={tabs}
        testID="group-members-role-tabs"
        value={filter}
      />
      <SectionHeader description={`${members.length} active memberships`} title="Group Directory" />
      {members.length === 0 ? (
        <EmptyState
          description="Members will appear after their requests are approved."
          title="No members yet"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          description="No members match the current search and role filter."
          title="No matching members"
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((member) => {
            const name = member.profile?.full_name?.trim() || "Unnamed member";
            return (
              <MemberRow
                key={member.membershipId}
                name={name}
                onCall={() => void openPhoneLink(member.profile?.phone ?? null)}
                phone={member.profile?.phone ?? "Phone unavailable"}
                role={toGroupDisplayRole(member.role)}
                statusLabel={member.status}
                testID={`group-directory-member-${member.membershipId}`}
              />
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  list: { gap: spacing.sm },
});
