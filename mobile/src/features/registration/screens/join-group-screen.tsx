import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  StatusBadge,
  TextField,
} from "@/components";
import { useSession } from "@/features/auth";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, opacity, radii, spacing, typography } from "@/theme";
import type { Json } from "@/types/database.types";

import { useGroupInvitation } from "../hooks/use-group-invitation";
import { useSubmitJoinRequest } from "../hooks/use-submit-join-request";
import {
  type RegistrationAnswerInput,
  type RegistrationQuestion,
  validateRegistrationAnswers,
} from "../types/registration-models";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

export function JoinGroupScreen(): JSX.Element {
  const router = useRouter();
  const { token = "" } = useLocalSearchParams<{ token: string }>();
  const { profile, session, user } = useSession();
  const invitationQuery = useGroupInvitation(token);
  const invitation = invitationQuery.data;
  const submitMutation = useSubmitJoinRequest(invitation?.groupId ?? "");
  const [showForm, setShowForm] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Json>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [localSubmittedAt, setLocalSubmittedAt] = useState<string | null>(null);
  const backAction = {
    accessibilityLabel: "Go back",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: () => router.back(),
    testID: "join-group-back",
  };

  if (invitationQuery.isLoading) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="join-invitation-loading"
      >
        <PageHeader leadingAction={backAction} title="Invitation" />
        <LoadingSkeleton lines={5} />
      </ScreenContainer>
    );
  }

  if (invitationQuery.isError || !invitation) {
    const network =
      isAppError(invitationQuery.error) && invitationQuery.error.code === "NETWORK_ERROR";
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        showGrid
        testID="join-invitation-invalid"
      >
        <PageHeader leadingAction={backAction} title="Invitation" />
        <EmptyState
          actionLabel={network ? "Retry" : "Enter Another Code"}
          description={
            network
              ? isAppError(invitationQuery.error)
                ? invitationQuery.error.message
                : userSafeErrorMessages.NETWORK_ERROR
              : "This invitation is invalid, revoked, or no longer available."
          }
          onActionPress={() =>
            network ? void invitationQuery.refetch() : router.replace("/join" as never)
          }
          testID={network ? "join-network-error" : "join-invalid-state"}
          title={network ? "Connection problem" : "Invalid invitation"}
        />
      </ScreenContainer>
    );
  }

  if (invitation.groupStatus !== "active") {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="join-archived-state">
        <PageHeader leadingAction={backAction} title={invitation.groupName} />
        <EmptyState
          description="This group or its trip has been archived."
          title="Group unavailable"
        />
      </ScreenContainer>
    );
  }

  if (invitation.membershipStatus === "active" && invitation.requestStatus !== "accepted") {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="join-already-member">
        <PageHeader leadingAction={backAction} title={invitation.groupName} />
        <EmptyState
          actionLabel="Open Groups"
          description="You already have an active membership in this group."
          onActionPress={() => router.replace("/(tabs)/groups")}
          title="Already a member"
        />
      </ScreenContainer>
    );
  }

  const visibleStatus = localSubmittedAt ? "pending" : invitation.requestStatus;
  if (visibleStatus === "pending" || visibleStatus === "accepted") {
    const accepted = visibleStatus === "accepted";
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        showGrid
        testID={`join-request-${visibleStatus}`}
      >
        <PageHeader
          leadingAction={backAction}
          subtitle={invitation.eventName}
          title={invitation.groupName}
        />
        <View style={styles.statusCard}>
          <StatusBadge status={accepted ? "active" : "pending"} />
          <Text style={styles.statusTitle}>
            {accepted ? "Request accepted" : "Request pending"}
          </Text>
          <Text style={styles.body}>
            {accepted
              ? "Your membership has been approved. Open Groups to continue."
              : "An organiser will review your registration. Duplicate submissions are blocked."}
          </Text>
          <Text style={styles.technical}>
            {`[ SUBMITTED ${formatTime(localSubmittedAt ?? invitation.requestSubmittedAt ?? new Date().toISOString())} ]`}
          </Text>
        </View>
        {accepted ? (
          <PrimaryButton
            fullWidth
            label="Open Groups"
            onPress={() => router.replace("/(tabs)/groups")}
          />
        ) : null}
      </ScreenContainer>
    );
  }

  if (!showForm) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="join-invitation-preview"
      >
        <PageHeader leadingAction={backAction} subtitle={invitation.eventName} title="Invitation" />
        <View style={styles.previewCard}>
          <Text style={styles.eyebrow}>[ GROUP INVITATION ]</Text>
          <Text style={styles.title}>{invitation.groupName}</Text>
          {invitation.groupDescription ? (
            <Text style={styles.body}>{invitation.groupDescription}</Text>
          ) : null}
          {invitation.organiserName ? (
            <Text
              style={styles.technical}
            >{`ORGANISED BY ${invitation.organiserName.toUpperCase()}`}</Text>
          ) : null}
          <Text style={styles.body}>
            {invitation.requiresRegistration
              ? `${invitation.questions.length} registration question${invitation.questions.length === 1 ? "" : "s"} required before review.`
              : "No custom registration questions are required."}
          </Text>
        </View>
        {invitation.requestStatus === "rejected" ? (
          <View style={styles.rejectedNotice} testID="join-request-rejected">
            <Text style={styles.errorTitle}>[ PREVIOUS REQUEST REJECTED ]</Text>
            <Text style={styles.body}>
              {invitation.rejectionReason ?? "You may submit a new request."}
            </Text>
          </View>
        ) : null}
        <PrimaryButton
          fullWidth
          label={session ? "Continue to Registration" : "Sign In to Continue"}
          onPress={() => {
            if (!session) {
              router.push({ pathname: "/sign-in", params: { returnTo: `/join/${token}` } });
            } else {
              setShowForm(true);
            }
          }}
          testID="join-invitation-continue"
        />
      </ScreenContainer>
    );
  }

  const answerInputs: RegistrationAnswerInput[] = Object.entries(answers).map(
    ([questionId, answer]) => ({ questionId, answer })
  );

  async function submit(): Promise<void> {
    const result = validateRegistrationAnswers(invitation!.questions, answerInputs);
    setValidationErrors(
      Object.fromEntries(result.issues.map((issue) => [issue.questionId, issue.message]))
    );
    if (!result.valid) return;
    try {
      await submitMutation.mutateAsync(answerInputs);
      setLocalSubmittedAt(new Date().toISOString());
    } catch {
      // The mutation error is rendered below with a user-safe message.
    }
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID="join-registration-form"
    >
      <PageHeader leadingAction={backAction} subtitle={invitation.groupName} title="Registration" />
      <View style={styles.identityCard}>
        <Text style={styles.eyebrow}>[ VERIFIED PROFILE ]</Text>
        <Text style={styles.body}>{profile?.full_name ?? "Name not provided"}</Text>
        <Text style={styles.body}>{user?.email ?? "Verified email unavailable"}</Text>
        <Text style={styles.body}>{profile?.phone ?? "Phone not provided"}</Text>
      </View>
      {invitation.questions.map((question, index) => (
        <JoinQuestion
          answer={answers[question.id]}
          error={validationErrors[question.id]}
          index={index}
          key={question.id}
          onChange={(answer) => setAnswers((current) => ({ ...current, [question.id]: answer }))}
          question={question}
        />
      ))}
      {submitMutation.error ? (
        <Text accessibilityRole="alert" style={styles.errorText} testID="join-submit-error">
          {isAppError(submitMutation.error)
            ? submitMutation.error.message
            : userSafeErrorMessages.UNKNOWN_ERROR}
        </Text>
      ) : null}
      <PrimaryButton
        fullWidth
        label="Submit Join Request"
        loading={submitMutation.isPending}
        onPress={() => void submit()}
        testID="submit-join-request"
      />
    </ScreenContainer>
  );
}

function JoinQuestion({
  question,
  index,
  answer,
  error,
  onChange,
}: {
  question: RegistrationQuestion;
  index: number;
  answer: Json | undefined;
  error?: string;
  onChange: (answer: Json) => void;
}): JSX.Element {
  const textType = ["short_text", "phone", "number"].includes(question.questionType);
  if (textType) {
    return (
      <TextField
        error={error}
        keyboardType={
          question.questionType === "number"
            ? "numeric"
            : question.questionType === "phone"
              ? "phone-pad"
              : "default"
        }
        label={`${index + 1}. ${question.label}`}
        onChangeText={(value) =>
          onChange(
            question.questionType === "number" ? (value.trim() ? Number(value) : null) : value
          )
        }
        required={question.isRequired}
        testID={`join-question-${question.id}`}
        value={answer === undefined ? "" : String(answer)}
      />
    );
  }
  if (question.questionType === "yes_no") {
    return (
      <View style={styles.questionCard}>
        <Text
          style={styles.questionLabel}
        >{`${index + 1}. ${question.label}${question.isRequired ? " *" : ""}`}</Text>
        <View style={styles.choiceRow}>
          <View style={styles.choiceButton}>
            <SecondaryButton fullWidth label="Yes" onPress={() => onChange(true)} />
          </View>
          <View style={styles.choiceButton}>
            <SecondaryButton fullWidth label="No" onPress={() => onChange(false)} />
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }
  const selected = Array.isArray(answer) ? answer : [];
  return (
    <View style={styles.questionCard}>
      <Text
        style={styles.questionLabel}
      >{`${index + 1}. ${question.label}${question.isRequired ? " *" : ""}`}</Text>
      {question.options.map((option) => {
        const active =
          question.questionType === "multiple_choice"
            ? selected.includes(option.value)
            : answer === option.value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.id}
            onPress={() => {
              if (question.questionType !== "multiple_choice") return onChange(option.value);
              onChange(
                active
                  ? selected.filter((value) => value !== option.value)
                  : [...selected, option.value]
              );
            }}
            style={({ pressed }) => [
              styles.choice,
              active && styles.choiceActive,
              pressed && styles.pressed,
            ]}
            testID={`join-question-${question.id}-option-${option.id}`}
          >
            <Text style={styles.body}>{option.label}</Text>
          </Pressable>
        );
      })}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing["3xl"] },
  previewCard: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  identityCard: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  statusCard: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.md,
  },
  rejectedNotice: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.gridLine,
    borderRadius: radii.sm,
  },
  eyebrow: { ...typography.technicalLabel, color: colors.accent },
  title: { ...typography.headingLarge, color: colors.textPrimary },
  statusTitle: { ...typography.headingMedium, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  technical: { ...typography.technicalLabel, color: colors.textSecondary },
  errorTitle: { ...typography.technicalLabel, color: colors.danger },
  errorText: { ...typography.caption, color: colors.danger },
  questionCard: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  questionLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  choiceRow: { flexDirection: "row", gap: spacing.sm },
  choiceButton: { flex: 1 },
  choice: {
    minHeight: layout.minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  choiceActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pressed: { opacity: opacity.pressed },
});
