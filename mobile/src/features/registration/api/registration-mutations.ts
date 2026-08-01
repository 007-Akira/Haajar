import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database.types";

import type {
  RegistrationAnswerInput,
  RegistrationDraftQuestionInput,
} from "../types/registration-models";

function validationError(): AppError {
  return new AppError({
    code: appErrorCodes.validation,
    message: userSafeErrorMessages[appErrorCodes.validation],
  });
}

export async function createRegistrationForm(groupId: string): Promise<string> {
  if (!groupId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("create_registration_form", {
    target_group_id: groupId,
  });
  if (error) throwSupabaseError(error, "createRegistrationForm");
  return data;
}

export async function saveRegistrationFormDraft(
  formId: string,
  questions: RegistrationDraftQuestionInput[]
): Promise<string> {
  if (!formId) throw validationError();
  const payload: Json = questions.map((question) => ({
    label: question.label,
    question_type: question.questionType,
    is_required: question.isRequired,
    position: question.position,
    options: question.options.map((option) => ({
      label: option.label,
      value: option.value,
      position: option.position,
    })),
  }));
  const { data, error } = await getSupabaseClient().rpc("save_registration_form_draft", {
    target_form_id: formId,
    questions: payload,
  });
  if (error) throwSupabaseError(error, "saveRegistrationFormDraft");
  return data;
}

export async function publishRegistrationForm(formId: string): Promise<string> {
  if (!formId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("publish_registration_form", {
    target_form_id: formId,
  });
  if (error) throwSupabaseError(error, "publishRegistrationForm");
  return data;
}

export async function submitJoinRequest(
  groupId: string,
  answers: RegistrationAnswerInput[]
): Promise<string> {
  if (!groupId) throw validationError();
  const payload = answers.map((answer) => ({
    question_id: answer.questionId,
    answer: answer.answer,
  })) as Json;
  const { data, error } = await getSupabaseClient().rpc("submit_join_request", {
    target_group_id: groupId,
    answers: payload,
  });
  if (error) throwSupabaseError(error, "submitJoinRequest");
  return data;
}

export async function correctRegistrationAnswer(
  answerId: string,
  correctedAnswer: Json
): Promise<string> {
  if (!answerId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("correct_registration_answer", {
    target_answer_id: answerId,
    corrected_answer: correctedAnswer,
  });
  if (error) throwSupabaseError(error, "correctRegistrationAnswer");
  return data;
}

export interface CreatedGroupInvitation {
  invitationId: string;
  invitationToken: string;
}

export async function createGroupInvitation(groupId: string): Promise<CreatedGroupInvitation> {
  if (!groupId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("create_group_invitation", {
    target_group_id: groupId,
  });
  if (error) throwSupabaseError(error, "createGroupInvitation");
  const invitation = data[0];
  if (!invitation) throw validationError();
  return {
    invitationId: invitation.invitation_id,
    invitationToken: invitation.invitation_token,
  };
}
