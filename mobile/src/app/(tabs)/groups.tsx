import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  RoleBadge,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  StatusBadge,
  TextField,
} from "@/components";
import { toGroupDisplayRole } from "@/features/events/permissions/event-permissions";
import { useUserGroups } from "@/features/groups/hooks/use-user-groups";
import { useSetMyGroupArchived } from "@/features/groups/hooks/use-group-lifecycle";
import type { ActiveUserGroup, UserGroupRequest } from "@/features/groups/types/group";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, opacity, radii, shadows, spacing, typography } from "@/theme";

const allEvents = "All trips";

export default function GroupsRoute(): JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState(allEvents);
  const groupsQuery = useUserGroups();
  const preferenceMutation = useSetMyGroupArchived();
  const overview = groupsQuery.data;
  const eventNames = useMemo(
    () => [
      allEvents,
      ...new Set([
        ...(overview?.activeGroups.map((group) => group.eventName) ?? []),
        ...(overview?.archivedGroups.map((group) => group.eventName) ?? []),
        ...(overview?.requests.map((request) => request.eventName) ?? []),
      ]),
    ],
    [overview]
  );
  const normalizedSearch = search.trim().toLowerCase();
  const matches = (groupName: string, eventName: string) =>
    (eventFilter === allEvents || eventName === eventFilter) &&
    (!normalizedSearch ||
      groupName.toLowerCase().includes(normalizedSearch) ||
      eventName.toLowerCase().includes(normalizedSearch));
  const activeGroups =
    overview?.activeGroups.filter((group) => matches(group.groupName, group.eventName)) ?? [];
  const archivedGroups =
    overview?.archivedGroups.filter((group) => matches(group.groupName, group.eventName)) ?? [];
  const pendingRequests =
    overview?.requests.filter(
      (request) => request.status === "pending" && matches(request.groupName, request.eventName)
    ) ?? [];
  const rejectedRequests =
    overview?.requests.filter(
      (request) => request.status === "rejected" && matches(request.groupName, request.eventName)
    ) ?? [];

  if (groupsQuery.isLoading) {
    return (
      <ScreenContainer scroll showGrid testID="groups-tab-loading">
        <PageHeader title="Groups" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  if (groupsQuery.isError) {
    return (
      <ScreenContainer showGrid testID="groups-tab-error">
        <PageHeader title="Groups" />
        <EmptyState
          actionLabel="Retry"
          description={
            isAppError(groupsQuery.error)
              ? groupsQuery.error.message
              : userSafeErrorMessages.UNKNOWN_ERROR
          }
          onActionPress={() => void groupsQuery.refetch()}
          testID="groups-tab-error-state"
          title="Could not load groups"
        />
      </ScreenContainer>
    );
  }

  const hasAnyData = Boolean(
    overview?.activeGroups.length || overview?.archivedGroups.length || overview?.requests.length
  );
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void groupsQuery.refetch()}
      refreshing={groupsQuery.isRefetching}
      scroll
      showGrid
      testID="groups-tab"
    >
      <PageHeader subtitle="Groups you’re part of" title="My Groups" />
      <View style={styles.quickActions}>
        <View style={styles.quickAction}>
          <PrimaryButton
            accessibilityLabel="Create a new trip"
            fullWidth
            label="Create Trip"
            onPress={() => router.push("/events/create")}
            testID="groups-create-trip-action"
          />
        </View>
        <View style={styles.quickAction}>
          <SecondaryButton
            accessibilityLabel="Join another group"
            fullWidth
            label="Join Group"
            onPress={() => router.push("/join" as never)}
            testID="groups-join-action"
          />
        </View>
      </View>

      {hasAnyData ? (
        <>
          <TextField
            accessibilityLabel="Search groups or trips"
            label="Search"
            onChangeText={setSearch}
            placeholder="Group or trip name"
            testID="groups-search-field"
            value={search}
          />
          <ScrollView
            accessibilityLabel="Filter groups by trip"
            contentContainerStyle={styles.filters}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroller}
          >
            {eventNames.map((eventName) => (
              <Pressable
                key={eventName}
                accessibilityLabel={`Show groups for ${eventName}`}
                accessibilityRole="button"
                accessibilityState={{ selected: eventFilter === eventName }}
                onPress={() => setEventFilter(eventName)}
                style={[styles.filter, eventFilter === eventName && styles.selectedFilter]}
                testID={`groups-event-filter-${eventName}`}
              >
                <Text
                  style={[
                    styles.filterText,
                    eventFilter === eventName && styles.selectedFilterText,
                  ]}
                >
                  {eventName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {!hasAnyData ? (
        <EmptyState
          actionLabel="Join Group"
          description="Your active group memberships and join requests will appear here under their trip."
          onActionPress={() => router.push("/join" as never)}
          testID="groups-tab-empty"
          title="No groups yet"
        />
      ) : activeGroups.length === 0 &&
        pendingRequests.length === 0 &&
        rejectedRequests.length === 0 ? (
        <EmptyState
          description="No groups or requests match this search and trip filter."
          testID="groups-tab-no-results"
          title="No matches"
        />
      ) : (
        <>
          {activeGroups.length ? (
            <View style={styles.section} testID="active-groups-section">
              <SectionHeader
                description="Active memberships, organised under each trip."
                title="Active Groups"
              />
              {groupByEvent(activeGroups).map(([eventName, groups]) => (
                <View key={eventName} style={styles.eventSection}>
                  <Text style={styles.eventLabel}>{`[ ${eventName.toUpperCase()} ]`}</Text>
                  {groups.map((group) => (
                    <ActiveGroupCard
                      key={group.membershipId}
                      group={group}
                      actionLabel="Archive for Me"
                      onAction={() =>
                        preferenceMutation.mutate({ groupId: group.groupId, archived: true })
                      }
                      onPress={() =>
                        router.push({
                          pathname: "/events/[eventId]/groups/[groupId]",
                          params: { eventId: group.eventId, groupId: group.groupId },
                        })
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {archivedGroups.length ? (
            <View style={styles.section} testID="archived-groups-section">
              <SectionHeader
                description="Hidden only from your active Groups view."
                title="Archived for Me"
              />
              {groupByEvent(archivedGroups).map(([eventName, groups]) => (
                <View key={eventName} style={styles.eventSection}>
                  <Text style={styles.eventLabel}>{`[ ${eventName.toUpperCase()} ]`}</Text>
                  {groups.map((group) => (
                    <ActiveGroupCard
                      key={group.membershipId}
                      group={group}
                      actionLabel="Restore Group"
                      onAction={() =>
                        preferenceMutation.mutate({ groupId: group.groupId, archived: false })
                      }
                      onPress={() =>
                        router.push({
                          pathname: "/events/[eventId]/groups/[groupId]",
                          params: { eventId: group.eventId, groupId: group.groupId },
                        })
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {pendingRequests.length ? (
            <View style={styles.section} testID="pending-groups-section">
              <SectionHeader
                description="Awaiting an organiser decision."
                title="Pending Requests"
              />
              {pendingRequests.map((request) => (
                <RequestCard
                  key={request.requestId}
                  onPress={() => router.push(`/group-requests/${request.requestId}` as never)}
                  request={request}
                />
              ))}
            </View>
          ) : null}

          {rejectedRequests.length ? (
            <View style={styles.section} testID="rejected-groups-section">
              <SectionHeader description="Previous requests." title="Request History" />
              {rejectedRequests.map((request) => (
                <RequestCard
                  key={request.requestId}
                  onPress={() => router.push(`/group-requests/${request.requestId}` as never)}
                  request={request}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

function groupByEvent(groups: ActiveUserGroup[]): [string, ActiveUserGroup[]][] {
  const grouped = new Map<string, ActiveUserGroup[]>();
  for (const group of groups)
    grouped.set(group.eventName, [...(grouped.get(group.eventName) ?? []), group]);
  return [...grouped.entries()];
}

function ActiveGroupCard({
  group,
  onPress,
  onAction,
  actionLabel,
}: {
  group: ActiveUserGroup;
  onPress: () => void;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <View style={styles.card} testID={`active-group-${group.groupId}`}>
      <Pressable
        accessibilityLabel={`Open ${group.groupName} in ${group.eventName}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardCopy}>
            <Text style={styles.groupName}>{group.groupName}</Text>
            <Text style={styles.eventName}>{group.eventName}</Text>
          </View>
          <RoleBadge role={toGroupDisplayRole(group.role)} />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.metadata}>{`${group.memberCount} ACTIVE MEMBERS`}</Text>
          <Text style={styles.qrState}>
            {group.qrAvailable ? "[ QR READY ]" : "[ QR ISSUES ON OPEN ]"}
          </Text>
        </View>
        <Text style={styles.openLabel}>OPEN GROUP →</Text>
      </Pressable>
      <SecondaryButton fullWidth label={actionLabel} onPress={onAction} />
    </View>
  );
}

function RequestCard({ request, onPress }: { request: UserGroupRequest; onPress: () => void }) {
  const submitted = new Date(request.submittedAt);
  const time = Number.isNaN(submitted.getTime()) ? "Time unavailable" : submitted.toLocaleString();
  return (
    <Pressable
      accessibilityLabel={`Open ${request.status} request for ${request.groupName}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      testID={`${request.status}-group-request-${request.requestId}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.groupName}>{request.groupName}</Text>
          <Text style={styles.eventName}>{request.eventName}</Text>
        </View>
        {request.status === "pending" ? <StatusBadge status="pending" /> : null}
      </View>
      <Text style={styles.metadata}>{`SUBMITTED ${time.toUpperCase()}`}</Text>
      {request.status === "rejected" ? <Text style={styles.rejected}>[ REJECTED ]</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["2xl"] },
  quickActions: { flexDirection: "row", gap: spacing.sm },
  quickAction: { flex: 1 },
  filterScroller: { flexGrow: 0 },
  filters: { alignItems: "center", gap: spacing.xs },
  filter: {
    height: layout.minimumTouchTarget,
    minHeight: layout.minimumTouchTarget,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  selectedFilter: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  filterText: { ...typography.technicalLabel, color: colors.textPrimary },
  selectedFilterText: { color: colors.background },
  section: { gap: spacing.md },
  eventSection: { gap: spacing.sm },
  eventLabel: { ...typography.technicalLabel, color: colors.accent },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.hardSmall,
  },
  pressed: { opacity: opacity.pressed, ...shadows.none },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardCopy: { flex: 1, gap: spacing.half },
  groupName: { ...typography.headingSmall, color: colors.textPrimary },
  eventName: { ...typography.caption, color: colors.textSecondary },
  cardFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  metadata: { ...typography.technicalLabel, color: colors.textSecondary },
  qrState: { ...typography.badge, color: colors.success },
  openLabel: { ...typography.technicalLabel, color: colors.accent, textAlign: "right" },
  rejected: { ...typography.technicalLabel, color: colors.danger },
});
