import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import {
  createRegistrationForm,
  publishRegistrationForm,
  saveRegistrationFormDraft,
} from "../api/registration-mutations";
import type { RegistrationDraftQuestionInput } from "../types/registration-models";

export function useRegistrationFormBuilder(groupId: string) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const invalidateForm = async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.registration.form(groupId, user.id),
    });
  };

  const createMutation = useMutation({
    mutationFn: () => createRegistrationForm(groupId),
    onSuccess: invalidateForm,
  });
  const saveMutation = useMutation({
    mutationFn: ({
      formId,
      questions,
    }: {
      formId: string;
      questions: RegistrationDraftQuestionInput[];
    }) => saveRegistrationFormDraft(formId, questions),
    onSuccess: invalidateForm,
  });
  const publishMutation = useMutation({
    mutationFn: (formId: string) => publishRegistrationForm(formId),
    onSuccess: invalidateForm,
  });

  return { createMutation, saveMutation, publishMutation };
}
