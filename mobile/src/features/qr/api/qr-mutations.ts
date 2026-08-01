import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

import { mapQrCredentialResult, type QrCredentialMutationResult } from "../types/qr-models";

type ChangeRoleRpcRow =
  Database["public"]["Functions"]["change_group_membership_role"]["Returns"][number];

export async function regenerateMembershipQr(
  membershipId: string
): Promise<QrCredentialMutationResult> {
  const { data, error } = await getSupabaseClient().rpc("regenerate_membership_qr", {
    target_membership_id: membershipId,
  });
  if (error) throwSupabaseError(error, "regenerateMembershipQr");
  const result = data[0];
  if (!result) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return mapQrCredentialResult(result);
}

export async function changeGroupMembershipRole(
  membershipId: string,
  newRole: "member" | "co_organiser" | "organiser" | "super_organiser"
): Promise<QrCredentialMutationResult | null> {
  const { data, error } = await getSupabaseClient().rpc("change_group_membership_role", {
    target_membership_id: membershipId,
    new_role: newRole,
  });
  if (error) throwSupabaseError(error, "changeGroupMembershipRole");
  const result: ChangeRoleRpcRow | undefined = data[0];
  if (!result) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  if (!result.qr_credential_id && !result.qr_token && result.qr_version === null) return null;
  return mapQrCredentialResult(result);
}
