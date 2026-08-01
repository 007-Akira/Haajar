import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PageHeader, PrimaryButton, ScreenContainer, TextField } from "@/components";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { useCreateEvent } from "../hooks/use-create-event";

export function CreateTripScreen(): JSX.Element {
  const router = useRouter();
  const createEventMutation = useCreateEvent();
  const submissionLock = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && !name.trim() ? "Enter a trip name." : undefined;

  async function handleSubmit(): Promise<void> {
    if (submissionLock.current) return;

    setSubmitted(true);
    createEventMutation.reset();
    if (!name.trim()) return;

    submissionLock.current = true;
    try {
      const eventId = await createEventMutation.mutateAsync({ name, description });
      if (eventId) {
        router.replace({ pathname: "/events/[eventId]", params: { eventId } });
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      return;
    } finally {
      submissionLock.current = false;
    }
  }

  const submitError = createEventMutation.isError
    ? isAppError(createEventMutation.error)
      ? createEventMutation.error.message
      : userSafeErrorMessages.UNKNOWN_ERROR
    : null;

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="create-trip-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back to Home",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: () => router.back(),
          testID: "create-trip-back-button",
        }}
        subtitle="Set up the shared space for everyone travelling together."
        testID="create-trip-header"
        title="Create Trip"
      />

      <View style={styles.form}>
        <TextField
          accessibilityLabel="Trip name"
          autoCapitalize="words"
          error={nameError}
          label="Trip name"
          onChangeText={setName}
          placeholder="Industrial Visit 2026"
          required
          returnKeyType="next"
          testID="create-trip-name-field"
          value={name}
        />
        <TextField
          accessibilityLabel="Trip description"
          helperText="Optional"
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="Add a short note about this trip"
          testID="create-trip-description-field"
          value={description}
        />
      </View>

      <View style={styles.everyoneInfo} testID="create-trip-everyone-info">
        <Text style={styles.infoLabel}>[ EVERYONE ]</Text>
        <Text style={styles.infoTitle}>Automatic main group</Text>
        <Text style={styles.infoBody}>
          Every approved trip member is included in Everyone. Internal groups stay organised inside
          this trip.
        </Text>
      </View>

      <View style={styles.footer}>
        {submitError ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.error}
            testID="create-trip-submit-error"
          >
            {submitError}
          </Text>
        ) : null}
        <Text style={styles.note}>[ YOU WILL BE ADDED AS THIS TRIP&apos;S SUPER ORGANISER ]</Text>
        <PrimaryButton
          accessibilityLabel="Create trip"
          disabled={createEventMutation.isPending}
          fullWidth
          label="Create Trip"
          loading={createEventMutation.isPending}
          onPress={() => void handleSubmit()}
          testID="create-trip-submit-button"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing["2xl"],
    paddingBottom: spacing["2xl"],
  },
  form: {
    gap: spacing.xl,
  },
  footer: {
    gap: spacing.md,
  },
  everyoneInfo: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  infoLabel: { ...typography.technicalLabel, color: colors.accent },
  infoTitle: { ...typography.headingSmall, color: colors.textPrimary },
  infoBody: { ...typography.body, color: colors.textSecondary },
  note: {
    ...typography.technicalLabel,
    color: colors.textSecondary,
    textAlign: "center",
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
});
