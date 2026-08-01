import type { Json, Tables } from "@/types/database.types";

export const registrationQuestionTypes = [
  "short_text",
  "number",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "yes_no",
  "phone",
] as const;

export type RegistrationQuestionType = (typeof registrationQuestionTypes)[number];
export type RegistrationFormStatus = "draft" | "published";

export function normalizeJoinTokenInput(value: string): string {
  const match = value.trim().match(/(?:haajar:\/\/)?join\/([a-zA-Z0-9-]+)/i);
  return (match?.[1] ?? value).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function fingerprintJoinToken(token: string): string {
  let hash = 2166136261;
  for (const character of normalizeJoinTokenInput(token)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function canManageRegistrationForm(
  role: string | null | undefined,
  membershipStatus: string | null | undefined
): boolean {
  return membershipStatus === "active" && (role === "organiser" || role === "super_organiser");
}

export interface RegistrationOption {
  id: string;
  label: string;
  value: string;
  position: number;
}

export interface RegistrationQuestion {
  id: string;
  label: string;
  questionType: RegistrationQuestionType;
  isRequired: boolean;
  position: number;
  options: RegistrationOption[];
}

export interface RegistrationForm {
  id: string;
  groupId: string;
  status: RegistrationFormStatus;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questions: RegistrationQuestion[];
}

export interface GroupInvitationPreview {
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  groupStatus: string;
  eventName: string;
  organiserName: string | null;
  formId: string | null;
  requiresRegistration: boolean;
  questions: RegistrationQuestion[];
  membershipStatus: string | null;
  requestId: string | null;
  requestStatus: "pending" | "accepted" | "rejected" | "cancelled" | null;
  requestSubmittedAt: string | null;
  rejectionReason: string | null;
}

export interface RegistrationDraftOptionInput {
  label: string;
  value: string;
  position: number;
}

export interface RegistrationDraftQuestionInput {
  label: string;
  questionType: RegistrationQuestionType;
  isRequired: boolean;
  position: number;
  options: RegistrationDraftOptionInput[];
}

export interface EditableRegistrationQuestion extends RegistrationDraftQuestionInput {
  clientId: string;
}

export type RegistrationDraftErrors = Record<string, string>;

export function validateRegistrationDraftQuestions(
  questions: EditableRegistrationQuestion[],
  requireQuestion: boolean
): RegistrationDraftErrors {
  const errors: RegistrationDraftErrors = {};
  if (requireQuestion && questions.length === 0) errors.form = "Add at least one question.";

  for (const question of questions) {
    if (!question.label.trim()) {
      errors[question.clientId] = "Question label is required.";
      continue;
    }
    if (["single_choice", "multiple_choice", "dropdown"].includes(question.questionType)) {
      const values = question.options.map((option) => option.value.trim());
      if (question.options.length < 2) {
        errors[question.clientId] = "Choice questions need at least two options.";
      } else if (question.options.some((option) => !option.label.trim() || !option.value.trim())) {
        errors[question.clientId] = "Every option needs a label.";
      } else if (new Set(values).size !== values.length) {
        errors[question.clientId] = "Option values must be unique.";
      }
    }
  }
  return errors;
}

export interface RegistrationAnswerInput {
  questionId: string;
  answer: Json;
}

export interface AnswerValidationIssue {
  questionId: string;
  message: string;
}

export interface AnswerValidationResult {
  valid: boolean;
  issues: AnswerValidationIssue[];
}

export type RegistrationFormRow = Tables<"registration_forms">;
export type RegistrationQuestionRow = Tables<"registration_questions">;
export type RegistrationOptionRow = Tables<"registration_options">;

export function validateRegistrationAnswers(
  questions: RegistrationQuestion[],
  answers: RegistrationAnswerInput[]
): AnswerValidationResult {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
  const issues: AnswerValidationIssue[] = [];

  for (const answer of answers) {
    if (answers.filter((candidate) => candidate.questionId === answer.questionId).length > 1) {
      if (!issues.some((issue) => issue.questionId === answer.questionId)) {
        issues.push({ questionId: answer.questionId, message: "Duplicate registration answer." });
      }
    }
  }

  for (const question of questions) {
    const answer = answerMap.get(question.id);
    const missing = answer === undefined || answer === null;
    if (missing) {
      if (question.isRequired) {
        issues.push({ questionId: question.id, message: "This answer is required." });
      }
      continue;
    }

    const optionValues = new Set(question.options.map((option) => option.value));
    let valid = true;
    switch (question.questionType) {
      case "short_text":
      case "phone":
        valid = typeof answer === "string" && answer.trim().length > 0;
        break;
      case "number":
        valid = typeof answer === "number" && Number.isFinite(answer);
        break;
      case "yes_no":
        valid = typeof answer === "boolean";
        break;
      case "single_choice":
      case "dropdown":
        valid = typeof answer === "string" && optionValues.has(answer);
        break;
      case "multiple_choice":
        valid =
          Array.isArray(answer) &&
          answer.length > 0 &&
          answer.every((value) => typeof value === "string" && optionValues.has(value));
        break;
    }

    if (!valid) {
      issues.push({ questionId: question.id, message: "This answer is invalid." });
    }
  }

  for (const answer of answers) {
    if (!questions.some((question) => question.id === answer.questionId)) {
      issues.push({ questionId: answer.questionId, message: "Unknown registration question." });
    }
  }

  return { valid: issues.length === 0, issues };
}
