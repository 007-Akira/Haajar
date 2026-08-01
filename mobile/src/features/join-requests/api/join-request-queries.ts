import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database.types";

import type {
  JoinRequest,
  JoinRequestRow,
  JoinRequestStatus,
  JoinRequestStatusDetail,
  RegistrationAnswerRow,
} from "../types/join-request-models";

type JoinRequestQueryRow = JoinRequestRow & { registration_answers: RegistrationAnswerRow[] };

export function mapJoinRequest(row: JoinRequestQueryRow): JoinRequest {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    status: row.status as JoinRequestStatus,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    answers: row.registration_answers.map((answer) => ({
      id: answer.id,
      questionId: answer.question_id,
      answer: answer.answer_json,
      correctedBy: answer.corrected_by,
      correctedAt: answer.corrected_at,
    })),
  };
}

export async function getCurrentJoinRequest(
  groupId: string,
  userId: string
): Promise<JoinRequest | null> {
  const { data, error } = await getSupabaseClient()
    .from("join_requests")
    .select("*, registration_answers(*)")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throwSupabaseError(error, "getCurrentJoinRequest");
  return data ? mapJoinRequest(data as JoinRequestQueryRow) : null;
}

export async function listPendingJoinRequests(groupId: string): Promise<JoinRequest[]> {
  return listGroupJoinRequests(groupId, "pending");
}

function jsonObject(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === "object" ? value : {};
}

export async function getJoinRequestStatusDetail(
  requestId: string
): Promise<JoinRequestStatusDetail> {
  const { data, error } = await getSupabaseClient().rpc("get_join_request_status", {
    target_request_id: requestId,
  });
  if (error) throwSupabaseError(error, "getJoinRequestStatusDetail");
  const row = jsonObject(data);
  const answers = Array.isArray(row.answers) ? row.answers : [];
  return {
    requestId: String(row.request_id ?? requestId),
    groupId: String(row.group_id ?? ""),
    groupName: String(row.group_name ?? "Group"),
    eventId: String(row.event_id ?? ""),
    eventName: String(row.event_name ?? "Trip"),
    status: String(row.status ?? "pending") as JoinRequestStatus,
    submittedAt: String(row.submitted_at ?? ""),
    reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    rejectionReason: typeof row.rejection_reason === "string" ? row.rejection_reason : null,
    answers: answers.map((raw) => {
      const answer = jsonObject(raw);
      return {
        id: String(answer.id ?? ""),
        questionId: String(answer.question_id ?? ""),
        label: String(answer.label ?? "Question"),
        answer: answer.answer ?? null,
      };
    }),
  };
}

export async function listGroupJoinRequests(
  groupId: string,
  status: Exclude<JoinRequestStatus, "cancelled">
): Promise<JoinRequest[]> {
  const { data, error } = await getSupabaseClient().rpc("list_group_join_requests", {
    target_group_id: groupId,
    request_status: status,
  });
  if (error) throwSupabaseError(error, "listGroupJoinRequests");
  if (!Array.isArray(data)) return [];
  return data.map((raw) => {
    const row = jsonObject(raw);
    const profile = jsonObject(row.profile ?? null);
    const answers = Array.isArray(row.answers) ? row.answers : [];
    return {
      id: String(row.id ?? ""),
      groupId: String(row.group_id ?? groupId),
      userId: String(row.user_id ?? ""),
      status: String(row.status ?? status) as JoinRequestStatus,
      submittedAt: String(row.submitted_at ?? ""),
      reviewedBy: null,
      reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
      rejectionReason: typeof row.rejection_reason === "string" ? row.rejection_reason : null,
      answers: [],
      applicant: {
        fullName: String(profile.full_name ?? "Unnamed applicant"),
        phone: typeof profile.phone === "string" ? profile.phone : null,
        email: typeof profile.email === "string" ? profile.email : null,
      },
      displayAnswers: answers.map((rawAnswer, index) => {
        const answer = jsonObject(rawAnswer);
        return {
          id: String(answer.id ?? ""),
          questionId: String(answer.question_id ?? ""),
          label: String(answer.label ?? "Question"),
          questionType: String(answer.question_type ?? "short_text"),
          position: Number(answer.position ?? index),
          answer: answer.answer ?? null,
        };
      }),
    };
  });
}
