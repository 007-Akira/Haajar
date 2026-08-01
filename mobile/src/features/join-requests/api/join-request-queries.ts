import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import type {
  JoinRequest,
  JoinRequestRow,
  JoinRequestStatus,
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
  const { data, error } = await getSupabaseClient()
    .from("join_requests")
    .select("*, registration_answers(*)")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });
  if (error) throwSupabaseError(error, "listPendingJoinRequests");
  return (data as JoinRequestQueryRow[]).map(mapJoinRequest);
}
