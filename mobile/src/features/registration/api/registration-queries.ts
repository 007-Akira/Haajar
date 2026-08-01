import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database.types";

import type {
  GroupInvitationPreview,
  RegistrationForm,
  RegistrationFormRow,
  RegistrationOptionRow,
  RegistrationQuestionRow,
  RegistrationQuestionType,
} from "../types/registration-models";

type RegistrationFormQueryRow = RegistrationFormRow & {
  registration_questions: (RegistrationQuestionRow & {
    registration_options: RegistrationOptionRow[];
  })[];
};

export function mapRegistrationForm(row: RegistrationFormQueryRow): RegistrationForm {
  return {
    id: row.id,
    groupId: row.group_id,
    status: row.status as RegistrationForm["status"],
    publishedAt: row.published_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions: row.registration_questions
      .map((question) => ({
        id: question.id,
        label: question.label,
        questionType: question.question_type as RegistrationQuestionType,
        isRequired: question.is_required,
        position: question.position,
        options: question.registration_options
          .map((option) => ({
            id: option.id,
            label: option.label,
            value: option.value,
            position: option.position,
          }))
          .sort((left, right) => left.position - right.position),
      }))
      .sort((left, right) => left.position - right.position),
  };
}

export async function getRegistrationForm(groupId: string): Promise<RegistrationForm | null> {
  const { data, error } = await getSupabaseClient()
    .from("registration_forms")
    .select("*, registration_questions(*, registration_options(*))")
    .eq("group_id", groupId)
    .maybeSingle();

  if (error) throwSupabaseError(error, "getRegistrationForm");
  return data ? mapRegistrationForm(data as RegistrationFormQueryRow) : null;
}

function invitationObject(data: Json): Record<string, Json | undefined> {
  if (!data || Array.isArray(data) || typeof data !== "object") return {};
  return data;
}

export async function resolveGroupInvitation(token: string): Promise<GroupInvitationPreview> {
  const { data, error } = await getSupabaseClient().rpc("resolve_group_invitation", {
    invitation_token: token,
  });
  if (error) throwSupabaseError(error, "resolveGroupInvitation");
  const value = invitationObject(data);
  const rawQuestions = Array.isArray(value.questions) ? value.questions : [];
  return {
    groupId: String(value.group_id ?? ""),
    groupName: String(value.group_name ?? "Group"),
    groupDescription: typeof value.group_description === "string" ? value.group_description : null,
    groupStatus: String(value.group_status ?? "active"),
    eventName: String(value.event_name ?? "Trip"),
    organiserName: typeof value.organiser_name === "string" ? value.organiser_name : null,
    formId: typeof value.form_id === "string" ? value.form_id : null,
    requiresRegistration: value.requires_registration === true,
    questions: rawQuestions.map((raw, index) => {
      const question = invitationObject(raw);
      const options = Array.isArray(question.options) ? question.options : [];
      return {
        id: String(question.id ?? ""),
        label: String(question.label ?? "Question"),
        questionType: String(question.question_type ?? "short_text") as RegistrationQuestionType,
        isRequired: question.is_required === true,
        position: Number(question.position ?? index),
        options: options.map((rawOption, optionIndex) => {
          const option = invitationObject(rawOption);
          return {
            id: String(option.id ?? ""),
            label: String(option.label ?? "Option"),
            value: String(option.value ?? ""),
            position: Number(option.position ?? optionIndex),
          };
        }),
      };
    }),
    membershipStatus: typeof value.membership_status === "string" ? value.membership_status : null,
    requestId: typeof value.request_id === "string" ? value.request_id : null,
    requestStatus:
      typeof value.request_status === "string"
        ? (value.request_status as GroupInvitationPreview["requestStatus"])
        : null,
    requestSubmittedAt:
      typeof value.request_submitted_at === "string" ? value.request_submitted_at : null,
    rejectionReason: typeof value.rejection_reason === "string" ? value.rejection_reason : null,
  };
}
