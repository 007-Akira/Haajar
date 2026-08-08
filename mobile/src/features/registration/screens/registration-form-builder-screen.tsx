import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionHeader,
  useAppDialog,
} from "@/components";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupMembership } from "@/features/groups/hooks/use-group-membership";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";
import { colors, layout, radii, spacing, typography } from "@/theme";

import { RegistrationQuestionEditor } from "../components/registration-question-editor";
import { RegistrationFormPreview } from "../components/registration-form-preview";
import { useRegistrationForm } from "../hooks/use-registration-form";
import { useRegistrationFormBuilder } from "../hooks/use-registration-form-builder";
import {
  type EditableRegistrationQuestion,
  type RegistrationDraftErrors,
  type RegistrationQuestion,
  canManageRegistrationForm,
  validateRegistrationDraftQuestions,
} from "../types/registration-models";

type BuilderMode = "edit" | "preview";

function toEditableQuestion(
  question: RegistrationQuestion,
  index: number
): EditableRegistrationQuestion {
  return {
    clientId: question.id || `loaded-${index}`,
    label: question.label,
    questionType: question.questionType,
    isRequired: question.isRequired,
    position: index,
    options: question.options.map((option, position) => ({
      label: option.label,
      value: option.value,
      position,
    })),
  };
}

function mutationMessage(error: unknown): string {
  return isAppError(error) ? error.message : userSafeErrorMessages.UNKNOWN_ERROR;
}

export function RegistrationFormBuilderScreen(): JSX.Element {
  const dialog = useAppDialog();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ eventId: string; groupId: string }>();
  const groupQuery = useGroup(groupId);
  const membershipQuery = useGroupMembership(groupId);
  const formQuery = useRegistrationForm(groupId);
  const builder = useRegistrationFormBuilder(groupId);
  const [mode, setMode] = useState<BuilderMode>("edit");
  const [questions, setQuestions] = useState<EditableRegistrationQuestion[]>([]);
  const [errors, setErrors] = useState<RegistrationDraftErrors>({});
  const [dirty, setDirty] = useState(false);
  const initializedVersion = useRef<string | null>(null);
  const questionSequence = useRef(0);

  const form = formQuery.data;
  const isPublished = form?.status === "published";
  const role = membershipQuery.data?.role;
  const canManage = canManageRegistrationForm(role, membershipQuery.data?.status);

  useEffect(() => {
    if (!form || dirty) return;
    const version = `${form.id}:${form.updatedAt}`;
    if (initializedVersion.current === version) return;
    initializedVersion.current = version;
    setQuestions(form.questions.map(toEditableQuestion));
    setErrors({});
  }, [dirty, form]);

  const requestBack = useCallback((): void => {
    if (mode === "preview") {
      setMode("edit");
      return;
    }
    if (!dirty) {
      router.back();
      return;
    }
    dialog.alert("Discard unsaved changes?", "Your latest form edits have not been saved.", [
      { text: "Keep Editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          setDirty(false);
          setTimeout(() => router.back());
        },
      },
    ]);
  }, [dialog, dirty, mode, router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        requestBack();
        return true;
      });
      return () => subscription.remove();
    }, [requestBack])
  );

  const normalizedQuestions = useMemo(
    () => questions.map((question, position) => ({ ...question, position })),
    [questions]
  );
  const mutationError =
    builder.createMutation.error ?? builder.saveMutation.error ?? builder.publishMutation.error;
  const busy =
    builder.createMutation.isPending ||
    builder.saveMutation.isPending ||
    builder.publishMutation.isPending;

  function replaceQuestion(updated: EditableRegistrationQuestion): void {
    setQuestions((current) =>
      current.map((question) => (question.clientId === updated.clientId ? updated : question))
    );
    setErrors((current) => ({ ...current, [updated.clientId]: "" }));
    setDirty(true);
  }

  function moveQuestion(index: number, direction: -1 | 1): void {
    setQuestions((current) => {
      const next = [...current];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
    setDirty(true);
  }

  function addQuestion(): void {
    questionSequence.current += 1;
    setQuestions((current) => [
      ...current,
      {
        clientId: `new-${Date.now()}-${questionSequence.current}`,
        label: "Untitled question",
        questionType: "short_text",
        isRequired: false,
        position: current.length,
        options: [],
      },
    ]);
    setDirty(true);
  }

  async function saveDraft(): Promise<boolean> {
    if (!form) return false;
    const nextErrors = validateRegistrationDraftQuestions(normalizedQuestions, false);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    try {
      await builder.saveMutation.mutateAsync({ formId: form.id, questions: normalizedQuestions });
      setDirty(false);
      initializedVersion.current = null;
      return true;
    } catch {
      return false;
    }
  }

  async function openPreview(): Promise<void> {
    const nextErrors = validateRegistrationDraftQuestions(normalizedQuestions, true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setMode("preview");
  }

  function confirmPublish(): void {
    const nextErrors = validateRegistrationDraftQuestions(normalizedQuestions, true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !form) return;

    dialog.alert(
      "Publish and lock this form?",
      "Members can submit this form after publication. Questions and options can never be changed again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish and Lock",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (dirty && !(await saveDraft())) return;
              try {
                await builder.publishMutation.mutateAsync(form.id);
                setDirty(false);
                setMode("edit");
                initializedVersion.current = null;
              } catch {
                // Mutation state renders the user-safe error.
              }
            })();
          },
        },
      ]
    );
  }

  const backAction = {
    accessibilityLabel: mode === "preview" ? "Return to form editor" : "Go back to group details",
    icon: <Ionicons color={colors.textPrimary} name="arrow-back" size={layout.iconSize} />,
    onPress: requestBack,
    testID: "registration-builder-back",
  };

  if (membershipQuery.isLoading || membershipQuery.sessionLoading || formQuery.isLoading) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="form-builder-loading"
      >
        <PageHeader leadingAction={backAction} title="Registration Form" />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        <LoadingSkeleton lines={layout.skeletonDefaultLines} />
      </ScreenContainer>
    );
  }

  if (!canManage) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        showGrid
        testID="form-builder-unauthorised"
      >
        <PageHeader leadingAction={backAction} title="Registration Form" />
        <EmptyState
          actionLabel="Go Back"
          description="Only active organisers and super organisers can manage registration forms."
          onActionPress={() => router.back()}
          testID="form-builder-unauthorised-state"
          title="Organiser access required"
        />
      </ScreenContainer>
    );
  }

  if (formQuery.isError) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="form-builder-error">
        <PageHeader leadingAction={backAction} title="Registration Form" />
        <EmptyState
          actionLabel="Retry"
          description={mutationMessage(formQuery.error)}
          onActionPress={() => void formQuery.refetch()}
          testID="form-builder-error-state"
          title="Could not load form"
        />
      </ScreenContainer>
    );
  }

  if (!form) {
    if (builder.createMutation.isPending) {
      return (
        <ScreenContainer
          contentContainerStyle={styles.content}
          showGrid
          testID="form-builder-creating"
        >
          <PageHeader leadingAction={backAction} title="Registration Form" />
          <LoadingSkeleton lines={layout.skeletonDefaultLines} />
        </ScreenContainer>
      );
    }
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="form-builder-empty">
        <PageHeader
          leadingAction={backAction}
          subtitle={groupQuery.data?.name ?? "Group"}
          title="Registration Form"
        />
        <EmptyState
          actionLabel="Create Draft Form"
          description="Build the questions members must answer when requesting to join this group."
          onActionPress={() => builder.createMutation.mutate()}
          testID="form-builder-create-empty-state"
          title="No registration form"
        />
        {builder.createMutation.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {mutationMessage(builder.createMutation.error)}
          </Text>
        ) : null}
      </ScreenContainer>
    );
  }

  if (isPublished) {
    const publishedQuestions = form.questions.map(toEditableQuestion);
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="form-builder-published"
      >
        <PageHeader
          leadingAction={backAction}
          subtitle={groupQuery.data?.name ?? "Group"}
          title="Published Form"
        />
        <View
          accessibilityRole="alert"
          style={styles.lockedNotice}
          testID="form-builder-locked-notice"
        >
          <Text style={styles.lockedTitle}>[ PUBLISHED · STRUCTURE LOCKED ]</Text>
          <Text style={styles.lockedDescription}>
            Questions, order, requirements, and options are permanently read-only.
          </Text>
        </View>
        <RegistrationFormPreview questions={publishedQuestions} testID="published-form-preview" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      keyboardSafe
      scroll
      showGrid
      testID={mode === "preview" ? "form-builder-preview" : "form-builder-screen"}
    >
      <PageHeader
        leadingAction={backAction}
        subtitle={groupQuery.data?.name ?? "Group"}
        title={mode === "preview" ? "Preview Form" : "Registration Form"}
      />

      {dirty ? (
        <View style={styles.unsavedNotice} testID="form-builder-unsaved">
          <Text style={styles.unsavedTitle}>[ UNSAVED CHANGES ]</Text>
          <Text style={styles.unsavedDescription}>Save this draft before leaving the builder.</Text>
        </View>
      ) : (
        <Text style={styles.savedState} testID="form-builder-saved">
          [ DRAFT SAVED ]
        </Text>
      )}

      {mutationError ? (
        <Text
          accessibilityRole="alert"
          style={styles.errorText}
          testID="form-builder-mutation-error"
        >
          {mutationMessage(mutationError)}
        </Text>
      ) : null}

      {mode === "preview" ? (
        <>
          <RegistrationFormPreview questions={normalizedQuestions} testID="draft-form-preview" />
          <View style={styles.actionStack}>
            <PrimaryButton
              fullWidth
              label="Publish and Lock"
              loading={builder.publishMutation.isPending || builder.saveMutation.isPending}
              onPress={confirmPublish}
              testID="form-builder-publish"
            />
            <SecondaryButton
              disabled={busy}
              fullWidth
              label="Back to Editing"
              onPress={() => setMode("edit")}
              testID="form-builder-edit-again"
            />
          </View>
        </>
      ) : (
        <>
          <SectionHeader
            description="Questions appear to joining members in this order."
            title="Questions"
          />
          {normalizedQuestions.length === 0 ? (
            <EmptyState
              actionLabel="Add First Question"
              description="Add the information organisers need before approving a member."
              onActionPress={addQuestion}
              testID="form-builder-no-questions"
              title="No questions yet"
            />
          ) : (
            <View style={styles.questionList}>
              {normalizedQuestions.map((question, index) => (
                <RegistrationQuestionEditor
                  key={question.clientId}
                  error={errors[question.clientId]}
                  index={index}
                  onChange={replaceQuestion}
                  onDelete={() => {
                    setQuestions((current) =>
                      current.filter((item) => item.clientId !== question.clientId)
                    );
                    setDirty(true);
                  }}
                  onMoveDown={() => moveQuestion(index, 1)}
                  onMoveUp={() => moveQuestion(index, -1)}
                  question={question}
                  testID={`form-question-${index}`}
                  total={normalizedQuestions.length}
                />
              ))}
            </View>
          )}
          {errors.form ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {errors.form}
            </Text>
          ) : null}
          {normalizedQuestions.length > 0 ? (
            <SecondaryButton
              disabled={busy}
              fullWidth
              label="Add Question"
              onPress={addQuestion}
              testID="form-builder-add-question"
            />
          ) : null}
          <View style={styles.actionStack}>
            <PrimaryButton
              disabled={!dirty}
              fullWidth
              label="Save Draft"
              loading={builder.saveMutation.isPending}
              onPress={() => void saveDraft()}
              testID="form-builder-save"
            />
            <SecondaryButton
              disabled={busy || normalizedQuestions.length === 0}
              fullWidth
              label="Preview"
              onPress={() => void openPreview()}
              testID="form-builder-preview-button"
            />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing["3xl"],
  },
  questionList: {
    gap: spacing.md,
  },
  actionStack: {
    gap: spacing.sm,
  },
  unsavedNotice: {
    gap: spacing.half,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  unsavedTitle: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  unsavedDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  savedState: {
    ...typography.technicalLabel,
    color: colors.success,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.danger,
  },
  lockedNotice: {
    gap: spacing.half,
    padding: spacing.md,
    backgroundColor: colors.gridLine,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  lockedTitle: {
    ...typography.technicalLabel,
    color: colors.textPrimary,
  },
  lockedDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
