import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  MemberRow,
  PageHeader,
  RecentRollCallRow,
  RoleBadge,
  ScreenContainer,
  SectionHeader,
  StatusBadge,
} from "@/components";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { GroupPrimaryActions } from "../components/group-primary-actions";
import type { GroupActionId } from "../config/group-action-config";
import { getMockGroupDetails } from "../data/mock-group-details";

export function GroupDetailsScreen(): JSX.Element {
  const router = useRouter();
  const { eventId, groupId } = useLocalSearchParams<{
    eventId: string;
    groupId: string;
  }>();
  const [activityMessage, setActivityMessage] = useState("");
  const group = getMockGroupDetails(eventId, groupId);

  if (!group) {
    return (
      <ScreenContainer showGrid testID="group-details-error">
        <PageHeader
          leadingAction={{
            accessibilityLabel: "Go back",
            icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
            onPress: () => router.back(),
          }}
          title="Group"
        />
        <EmptyState
          actionLabel="Go Back"
          description="This mock group could not be found."
          onActionPress={() => router.back()}
          title="Group unavailable"
        />
      </ScreenContainer>
    );
  }

  function showMockMessage(message: string): void {
    setActivityMessage(message);
  }

  const groupRouteParams = { eventId: group.eventId, groupId: group.id };

  function handleGroupAction(actionId: GroupActionId): void {
    if (actionId === "show-my-qr") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/qr",
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "start-roll-call") {
      router.push({
        pathname: "/events/[eventId]/groups/[groupId]/roll-calls/create",
        params: groupRouteParams,
      });
      return;
    }

    if (actionId === "active-roll-call" || actionId === "scan-qr") {
      const rollCallParams = {
        ...groupRouteParams,
        rollCallId: "morning-assembly",
      };
      router.push({
        pathname:
          actionId === "scan-qr"
            ? "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]/scanner"
            : "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
        params: rollCallParams,
      });
      return;
    }

    router.push({
      pathname: "/events/[eventId]/groups/[groupId]/actions/[action]",
      params: {
        ...groupRouteParams,
        action: actionId,
      },
    });
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      scroll
      showGrid
      testID="group-details-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to trip details",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
          testID: "group-details-back-button",
        }}
        subtitle={group.eventName}
        title={group.name}
      />

      <View style={styles.summary} testID="group-summary">
        <View style={styles.summaryHeader}>
          <View style={styles.summaryCopy}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.description}>{group.description}</Text>
          </View>
          <RoleBadge role={group.userRole} />
        </View>
        <Text style={styles.memberCount}>{`${group.memberCount} MEMBERS`}</Text>
        {group.activeRollCallLabel ? (
          <View style={styles.activeStatus}>
            <StatusBadge status="active" />
            <Text style={styles.activeLabel}>{group.activeRollCallLabel}</Text>
          </View>
        ) : null}
      </View>

      <GroupPrimaryActions
        activeRollCall={group.activeRollCall}
        onActionPress={handleGroupAction}
        role={group.userRole}
        testID="group-primary-actions"
      />

      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
          {activityMessage}
        </Text>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          description={`${group.memberCount} members belong to this group.`}
          title="Members"
        />
        <View style={styles.list}>
          {group.members.map((member) => (
            <MemberRow
              internalGroupCount={member.internalGroupCount}
              key={member.id}
              name={member.name}
              onCall={() => showMockMessage(`Call action selected for ${member.name}.`)}
              phone={member.phone}
              role={member.eventRole}
              testID={`group-member-${member.id}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          description="Recent attendance sessions for this group."
          title="Recent roll calls"
        />
        {group.recentRollCalls.length > 0 ? (
          <View style={styles.list}>
            {group.recentRollCalls.map((rollCall) => (
              <RecentRollCallRow
                attendanceLabel={rollCall.attendanceLabel}
                date={rollCall.date}
                key={rollCall.id}
                name={rollCall.name}
                status={rollCall.status}
                testID={`recent-roll-call-${rollCall.id}`}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            description="Completed and active roll calls will appear here."
            testID="group-roll-calls-empty"
            title="No roll calls yet"
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          description="Shared details collected for this group."
          title="Group information"
        />
        <View style={styles.informationCard}>
          {group.information.map((item) => (
            <View key={item.label} style={styles.informationRow}>
              <Text style={styles.informationLabel}>{item.label.toUpperCase()}</Text>
              <Text style={styles.informationValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  summary: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.half,
  },
  groupName: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  memberCount: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  activeStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeLabel: {
    ...typography.caption,
    flex: 1,
    color: colors.textSecondary,
  },
  activityMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  informationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  informationRow: {
    gap: spacing.half,
    padding: spacing.md,
    borderBottomColor: colors.gridLine,
    borderBottomWidth: layout.borderWidth,
  },
  informationLabel: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
  },
  informationValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
});
