import type { Database, Json, Tables } from "@/types/database.types";

export type JoinRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type JoinRequestDecision = "accept" | "reject";

export interface JoinRequestAnswer {
  id: string;
  questionId: string;
  answer: Json;
  correctedBy: string | null;
  correctedAt: string | null;
}

export interface JoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: JoinRequestStatus;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  answers: JoinRequestAnswer[];
}

export interface JoinRequestReviewResult {
  joinRequestId: string;
  groupMembershipId: string | null;
  qrCredentialId: string | null;
  qrToken: string | null;
  qrVersion: number | null;
}

export type JoinRequestRow = Tables<"join_requests">;
export type RegistrationAnswerRow = Tables<"registration_answers">;

type ReviewRpcRow = Database["public"]["Functions"]["review_join_request"]["Returns"][number];

export function mapJoinRequestReview(row: ReviewRpcRow): JoinRequestReviewResult {
  return {
    joinRequestId: row.join_request_id,
    groupMembershipId: row.group_membership_id,
    qrCredentialId: row.qr_credential_id,
    qrToken: row.qr_token,
    qrVersion: row.qr_version,
  };
}
