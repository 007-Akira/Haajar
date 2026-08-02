import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

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
import { canManageEvent } from "@/features/events/permissions/event-permissions";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { useCreateGroup } from "../hooks/use-create-group";
import { useGroup } from "../hooks/use-group";

export function CreateGroupScreen(): JSX.Element {
  const params = useLocalSearchParams<{ eventId: string; categoryId?: string; groupId?: string }>();
  const eventId = params.eventId;
  const categoryId = params.categoryId ?? params.groupId;
  const router = useRouter();
  const eventQuery = useEvent(eventId);
  const membershipQuery = useEventMembership(eventId);
  const categoryQuery = useGroup(categoryId);
  const createGroupMutation = useCreateGroup();
  const submissionLock = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && !name.trim() ? "Enter a group name." : undefined;
  const backAction = {
    accessibilityLabel: "Go back to trip details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "create-group-back-button",
  };

  async function handleSubmit(): Promise<void> {
    if (submissionLock.current) return;

    setSubmitted(true);
    createGroupMutation.reset();
    if (!eventId || !name.trim()) return;

    submissionLock.current = true;
    try {
      const groupId = await createGroupMutation.mutateAsync({
        eventId,
        categoryId,
        name,
        description,
      });
      if (groupId) {
        router.replace({
          pathname: "/events/[eventId]/groups/[groupId]",
          params: { eventId, groupId },
        });
      } else {
        router.replace({ pathname: "/events/[eventId]", params: { eventId } });
      }
    } catch {
      return;
    } finally {
      submissionLock.current = false;
    }
  }

  if (
    eventQuery.isLoading ||
    membershipQuery.isLoading ||
    membershipQuery.sessionLoading ||
    (categoryId ? categoryQuery.isLoading : false)
  ) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        showGrid
        testID="create-group-loading"
      >
        <PageHeader
          leadingAction={backAction}
          title={categoryId ? "Create Operational Group" : "Create Category"}
        />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  if (eventQuery.isError || membershipQuery.isError || categoryQuery.isError) {
    const error = eventQuery.error ?? membershipQuery.error ?? categoryQuery.error;
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="create-group-error">
        <PageHeader
          leadingAction={backAction}
          title={categoryId ? "Create Operational Group" : "Create Category"}
        />
        <EmptyState
          actionLabel="Retry"
          description={isAppError(error) ? error.message : userSafeErrorMessages.UNKNOWN_ERROR}
          onActionPress={() => {
            void eventQuery.refetch();
            void membershipQuery.refetch();
          }}
          testID="create-group-context-error"
          title="Could not load trip"
        />
      </ScreenContainer>
    );
  }

  if (
    !eventQuery.data ||
    eventQuery.data.status !== "active" ||
    !membershipQuery.data ||
    membershipQuery.data.status !== "active" ||
    !canManageEvent(membershipQuery.data.role) ||
    (categoryId
      ? !categoryQuery.data ||
        categoryQuery.data.groupKind !== "category" ||
        categoryQuery.data.status !== "active"
      : false)
  ) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="create-group-denied">
        <PageHeader
          leadingAction={backAction}
          title={categoryId ? "Create Operational Group" : "Create Category"}
        />
        <EmptyState
          actionLabel="Go Back"
          description="Only an active trip super organiser can create this group."
          onActionPress={() => router.back()}
          testID="create-group-denied-state"
          title="Action unavailable"
        />
      </ScreenContainer>
    );
  }

  const submitError = createGroupMutation.isError
    ? isAppError(createGroupMutation.error)
      ? createGroupMutation.error.message
      : userSafeErrorMessages.UNKNOWN_ERROR
    : null;

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="create-group-screen"
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={eventQuery.data.name}
        testID="create-group-header"
        title={categoryId ? "Create Operational Group" : "Create Category"}
      />

      <View style={styles.form}>
        <TextField
          accessibilityLabel="Group name"
          autoCapitalize="words"
          error={nameError}
          label={categoryId ? "Operational group name" : "Category name"}
          onChangeText={setName}
          placeholder="Bus 2"
          required
          returnKeyType="next"
          testID="create-group-name-field"
          value={name}
        />
        <TextField
          accessibilityLabel="Group description"
          helperText="Optional"
          label="Description"
          multiline
          onChangeText={setDescription}
          placeholder="Add a short note about this group"
          testID="create-group-description-field"
          value={description}
        />
      </View>

      <View style={styles.scopeInfo} testID="create-group-scope-info">
        <Text style={styles.infoLabel}>
          {categoryId ? "[ OPERATIONAL SUBGROUP ]" : "[ CATEGORY GROUP ]"}
        </Text>
        <Text style={styles.infoBody}>
          {categoryId
            ? `This group will operate under ${categoryQuery.data?.name ?? "the selected category"}.`
            : "Categories organise operational subgroups such as Bus 1 or Train 2."}
        </Text>
      </View>

      <View style={styles.footer}>
        {submitError ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.error}
            testID="create-group-submit-error"
          >
            {submitError}
          </Text>
        ) : null}
        <Text style={styles.note}>[ YOU WILL JOIN THIS GROUP AS ITS ORGANISER ]</Text>
        <PrimaryButton
          accessibilityLabel="Create group"
          disabled={createGroupMutation.isPending}
          fullWidth
          label={categoryId ? "Create Operational Group" : "Create Category"}
          loading={createGroupMutation.isPending}
          onPress={() => void handleSubmit()}
          testID="create-group-submit-button"
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
  scopeInfo: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  infoLabel: { ...typography.technicalLabel, color: colors.accent },
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
