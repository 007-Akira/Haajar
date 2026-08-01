import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  EventCard,
  IconButton,
  LoadingSkeleton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from "@/components";
import { useSession } from "@/features/auth";
import { useEvents } from "@/features/events/hooks/use-events";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, spacing, typography } from "@/theme";

function formatCreatedDate(createdAt: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(createdAt));
}

export function HomeScreen(): JSX.Element {
  const router = useRouter();
  const { profile } = useSession();
  const eventsQuery = useEvents();
  const [activityMessage, setActivityMessage] = useState("");
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={eventsQuery.sessionMissing ? undefined : () => void eventsQuery.refetch()}
      refreshing={eventsQuery.isRefetching && !eventsQuery.isLoading}
      scroll
      showGrid
      testID="home-screen"
    >
      <View style={styles.header}>
        <View style={styles.greetingGroup}>
          <Text style={styles.eyebrow}>[ HAAJAR HOME ]</Text>
          <Text accessibilityRole="header" style={styles.greeting}>
            {`Good evening, ${firstName}`}
          </Text>
        </View>
        <IconButton
          accessibilityLabel="Open notifications"
          icon={
            <Ionicons
              color={colors.textPrimary}
              name="notifications-outline"
              size={layout.iconSize}
            />
          }
          onPress={() => setActivityMessage("Notifications preview selected.")}
          testID="home-notifications-button"
        />
      </View>

      <View style={styles.quickActions}>
        <View style={styles.quickAction}>
          <SecondaryButton
            fullWidth
            label="Join Group"
            onPress={() => router.push("/join" as never)}
            testID="join-trip-button"
          />
        </View>
        <View style={styles.quickAction}>
          <PrimaryButton
            fullWidth
            label="Create Trip"
            onPress={() => router.push("/events/create")}
            testID="create-trip-button"
          />
        </View>
      </View>

      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
          {activityMessage}
        </Text>
      ) : null}

      <View style={styles.tripsSection}>
        <SectionHeader
          description="Select a trip to see its groups and attendance."
          title="Your trips"
        />
        <View style={styles.tripList}>
          {eventsQuery.sessionLoading || eventsQuery.isLoading ? (
            <LoadingSkeleton lines={5} testID="home-events-loading" />
          ) : eventsQuery.sessionMissing ? (
            <EmptyState
              description="Your session is unavailable. Sign in again to load your trips."
              testID="home-events-session-missing"
              title="Sign in required"
            />
          ) : eventsQuery.isError ? (
            <EmptyState
              actionAccessibilityLabel="Retry loading trips"
              actionLabel="Retry"
              description={
                isAppError(eventsQuery.error)
                  ? eventsQuery.error.message
                  : userSafeErrorMessages.UNKNOWN_ERROR
              }
              onActionPress={() => void eventsQuery.refetch()}
              testID="home-events-error"
              title="Trips could not be loaded"
            />
          ) : eventsQuery.data?.length === 0 ? (
            <EmptyState
              description="Trips you join or create will appear here."
              testID="home-events-empty"
              title="No trips yet"
            />
          ) : (
            eventsQuery.data?.map((event) => (
              <EventCard
                active={event.status === "active"}
                date={`Created ${formatCreatedDate(event.createdAt)}`}
                eventName={event.name}
                groupCount={event.internalGroupCount}
                key={event.id}
                onPress={() =>
                  router.push({
                    pathname: "/events/[eventId]",
                    params: { eventId: event.id },
                  })
                }
                participantCount={event.activeMemberCount}
                testID={`trip-card-${event.id}`}
                userRole={event.currentRole}
              />
            ))
          )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  greetingGroup: {
    flex: 1,
    gap: spacing.half,
  },
  eyebrow: {
    ...typography.technicalLabel,
    color: colors.accent,
  },
  greeting: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
  },
  activityMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tripsSection: {
    gap: spacing.sm,
  },
  tripList: {
    gap: spacing.md,
  },
});
