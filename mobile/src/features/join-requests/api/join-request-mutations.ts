import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import {
  mapJoinRequestReview,
  type JoinRequestDecision,
  type JoinRequestReviewResult,
} from "../types/join-request-models";

export async function reviewJoinRequest(
  requestId: string,
  decision: JoinRequestDecision,
  rejectionReason?: string
): Promise<JoinRequestReviewResult> {
  if (!requestId) {
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  }
  const args = rejectionReason?.trim()
    ? { target_request_id: requestId, decision, rejection_reason: rejectionReason.trim() }
    : { target_request_id: requestId, decision };
  const { data, error } = await getSupabaseClient().rpc("review_join_request", args);
  if (error) throwSupabaseError(error, "reviewJoinRequest");
  const result = data[0];
  if (!result) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return mapJoinRequestReview(result);
}
