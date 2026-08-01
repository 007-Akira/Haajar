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

export interface JoinRequestDisplayAnswer {
  id: string;
  questionId: string;
  label: string;
  questionType: string;
  position: number;
  answer: Json;
}

export interface JoinRequestApplicant {
  fullName: string;
  phone: string | null;
  email: string | null;
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
  applicant?: JoinRequestApplicant;
  displayAnswers?: JoinRequestDisplayAnswer[];
}

export interface JoinRequestReviewResult {
  joinRequestId: string;
  groupMembershipId: string | null;
  qrCredentialId: string | null;
  qrToken: string | null;
  qrVersion: number | null;
}

export interface JoinRequestStatusDetail {
  requestId: string;
  groupId: string;
  groupName: string;
  eventId: string;
  eventName: string;
  status: JoinRequestStatus;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  answers: { id: string; questionId: string; label: string; answer: Json }[];
}

export function canReviewJoinRequests(role?: string, status?: string): boolean {
  return status === "active" && (role === "organiser" || role === "super_organiser");
}

export function formatRegistrationAnswer(answer: Json): string {
  if (Array.isArray(answer)) return answer.map(String).join(", ");
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (answer === null || answer === "") return "Not answered";
  if (typeof answer === "object") return Object.values(answer).map(String).join(", ");
  return String(answer);
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
