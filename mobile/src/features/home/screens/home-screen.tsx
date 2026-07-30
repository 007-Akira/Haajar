import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EventCard,
  IconButton,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
} from "@/components";
import { colors, layout, spacing, typography } from "@/theme";

import { ActiveRollCallNotice } from "../components/active-roll-call-notice";
import { mockActiveRollCall, mockTrips, mockUser } from "../data/mock-home";

export function HomeScreen(): JSX.Element {
  const router = useRouter();
  const [activityMessage, setActivityMessage] = useState("");

  return (
    <ScreenContainer contentContainerStyle={styles.content} scroll showGrid testID="home-screen">
      <View style={styles.header}>
        <View style={styles.greetingGroup}>
          <Text style={styles.eyebrow}>[ HAAJAR HOME ]</Text>
          <Text accessibilityRole="header" style={styles.greeting}>
            {`Good evening, ${mockUser.firstName}`}
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
            label="Join Trip"
            onPress={() => setActivityMessage("Join Trip selected.")}
            testID="join-trip-button"
          />
        </View>
        <View style={styles.quickAction}>
          <PrimaryButton
            fullWidth
            label="Create Trip"
            onPress={() => setActivityMessage("Create Trip selected.")}
            testID="create-trip-button"
          />
        </View>
      </View>

      {activityMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.activityMessage}>
          {activityMessage}
        </Text>
      ) : null}

      <ActiveRollCallNotice
        label={mockActiveRollCall.label}
        onPress={() => setActivityMessage(`${mockActiveRollCall.tripName} roll call selected.`)}
        testID="active-roll-call-notice"
        tripName={mockActiveRollCall.tripName}
      />

      <View style={styles.tripsSection}>
        <SectionHeader
          description="Select a trip to see its groups and attendance."
          title="Your trips"
        />
        <View style={styles.tripList}>
          {mockTrips.map((trip) => (
            <EventCard
              active={trip.active}
              date={trip.dateOrStatus}
              eventName={trip.name}
              groupCount={trip.groupCount}
              key={trip.id}
              onPress={() =>
                router.push({
                  pathname: "/events/[eventId]",
                  params: { eventId: trip.id },
                })
              }
              participantCount={trip.participantCount}
              testID={`trip-card-${trip.id}`}
              userRole={trip.role}
            />
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
