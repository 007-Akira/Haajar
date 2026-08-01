import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import type {
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
