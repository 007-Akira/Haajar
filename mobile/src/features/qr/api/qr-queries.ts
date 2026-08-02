import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import {
  mapQrCredentialResult,
  mapMembershipQrResolution,
  redactQrToken,
  type MembershipQr,
  type MembershipQrResolution,
  type QrCredentialMutationResult,
} from "../types/qr-models";

export const membershipQrIsEphemeral = true;

export async function resolveMembershipQr(
  presentedToken: string,
  expectedGroupId: string
): Promise<MembershipQrResolution> {
  const { data, error } = await getSupabaseClient().rpc("resolve_membership_qr", {
    presented_token: presentedToken,
    expected_group_id: expectedGroupId,
  });
  if (error) throwSupabaseError(redactQrToken(error), "resolveMembershipQr");
  const result = data[0];
  if (!result) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return mapMembershipQrResolution(result);
}

export function toMembershipQr(
  membershipId: string,
  result: QrCredentialMutationResult,
  receivedAt = new Date().toISOString()
): MembershipQr {
  return {
    membershipId,
    credentialId: result.credentialId,
    token: result.token,
    version: result.version,
    receivedAt,
  };
}

export async function getMembershipQr(membershipId: string): Promise<MembershipQr> {
  const { data, error } = await getSupabaseClient().rpc("get_membership_qr", {
    target_membership_id: membershipId,
  });
  if (error) throwSupabaseError(error, "getMembershipQr");
  const result = data[0];
  if (!result) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return toMembershipQr(membershipId, mapQrCredentialResult(result));
}
