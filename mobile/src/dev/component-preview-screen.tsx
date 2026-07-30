import { useState } from "react";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  EventCard,
  IconButton,
  LoadingSkeleton,
  PageHeader,
  PhoneField,
  PrimaryButton,
  RoleBadge,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  StatusBadge,
  TextField,
  type Status,
  type UserRole,
} from "@/components";
import { colors, spacing, typography } from "@/theme";

const roles: UserRole[] = ["member", "co-organiser", "organiser", "super organiser"];
const statuses: Status[] = [
  "active",
  "present",
  "absent",
  "pending",
  "synced",
  "pending sync",
  "error",
];

export function ComponentPreviewScreen(): JSX.Element {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="component-preview"
    >
      <PageHeader
        subtitle="Internal development module—not registered with Expo Router"
        title="Component preview"
      />

      <SectionHeader actionLabel="Action" onActionPress={() => undefined} title="Actions" />
      <PrimaryButton label="Primary" onPress={() => undefined} />
      <PrimaryButton disabled label="Disabled" onPress={() => undefined} />
      <PrimaryButton fullWidth label="Full width" onPress={() => undefined} />
      <PrimaryButton label="Loading" loading onPress={() => undefined} />
      <SecondaryButton label="Secondary" onPress={() => undefined} />
      <IconButton
        accessibilityLabel="Preview icon action"
        icon={<Text style={styles.icon}>+</Text>}
        onPress={() => undefined}
      />

      <SectionHeader description="Focus fields to see their active state." title="Forms" />
      <TextField
        helperText="Enter the name shown to organisers."
        label="Full name"
        onChangeText={setName}
        placeholder="Your name"
        required
        value={name}
      />
      <PhoneField
        label="Phone"
        onChangeText={setPhone}
        placeholder="+91 00000 00000"
        value={phone}
      />
      <TextField
        error="This field needs attention."
        label="Error example"
        onChangeText={() => undefined}
        value=""
      />
      <TextField
        disabled
        helperText="Disabled field"
        label="Disabled example"
        onChangeText={() => undefined}
        value="Unavailable"
      />

      <SectionHeader title="Cards and status" />
      <EventCard
        active
        date="12 August 2026"
        eventName="Industrial Visit 2026"
        groupCount={4}
        onPress={() => undefined}
        participantCount={128}
        userRole="organiser"
      />
      <View style={styles.wrap}>
        {roles.map((role) => (
          <RoleBadge key={role} role={role} />
        ))}
      </View>
      <View style={styles.wrap}>
        {statuses.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </View>

      <SectionHeader title="Feedback" />
      <EmptyState
        actionLabel="Create event"
        description="Create an event to begin organising attendance."
        onActionPress={() => undefined}
        title="No events yet"
      />
      <LoadingSkeleton />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  icon: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
});
