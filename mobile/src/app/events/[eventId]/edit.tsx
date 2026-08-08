import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type JSX } from "react";
import { Alert, StyleSheet } from "react-native";
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  TextField,
} from "@/components";
import { useEvent } from "@/features/events/hooks/use-event";
import { useEventMembership } from "@/features/events/hooks/use-event-membership";
import { useUpdateEvent } from "@/features/events/hooks/use-event-lifecycle";
import { colors, layout, spacing } from "@/theme";

export default function EditTripRoute(): JSX.Element {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const event = useEvent(eventId);
  const membership = useEventMembership(eventId);
  const back = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
  };
  if (event.isLoading || membership.isLoading)
    return (
      <ScreenContainer>
        <PageHeader leadingAction={back} title="Edit Trip" />
        <LoadingSkeleton />
      </ScreenContainer>
    );
  if (!event.data || membership.data?.role !== "super_organiser")
    return (
      <ScreenContainer>
        <PageHeader leadingAction={back} title="Edit Trip" />
        <EmptyState
          title="Not authorised"
          description="Only the trip super organiser can edit this trip."
        />
      </ScreenContainer>
    );
  return <EditTripForm key={event.data.id} event={event.data} onBack={() => router.back()} />;
}

function EditTripForm({
  event,
  onBack,
}: {
  event: { id: string; name: string; description: string | null };
  onBack: () => void;
}): JSX.Element {
  const mutation = useUpdateEvent();
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  return (
    <ScreenContainer
      keyboardSafe
      scroll
      contentContainerStyle={styles.content}
      testID="edit-trip-screen"
    >
      <PageHeader
        leadingAction={{
          accessibilityLabel: "Go back",
          icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
          onPress: onBack,
        }}
        title="Edit Trip"
        subtitle="Update safe trip metadata."
      />
      <TextField
        label="Trip name"
        required
        value={name}
        onChangeText={setName}
        testID="edit-trip-name"
      />
      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="edit-trip-description"
      />
      <PrimaryButton
        fullWidth
        label="Save Trip"
        loading={mutation.isPending}
        disabled={!name.trim() || mutation.isPending}
        onPress={() =>
          mutation.mutate(
            { eventId: event.id, name, description },
            {
              onSuccess: onBack,
              onError: (error) => Alert.alert("Trip not updated", error.message),
            }
          )
        }
        testID="save-trip-edit"
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ content: { gap: spacing.lg } });
