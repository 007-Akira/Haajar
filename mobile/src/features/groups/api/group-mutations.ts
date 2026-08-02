import { AppError, appErrorCodes, throwSupabaseError, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import type { AssignableGroupRole } from "../config/role-management";
import { mapRoleChangeError, toChangeGroupRoleRpcArgs } from "../config/role-change-contract";

export { mapRoleChangeError, toChangeGroupRoleRpcArgs } from "../config/role-change-contract";

export interface CreateGroupParameters {
  eventId: string;
  categoryId?: string;
  name: string;
  description?: string;
}

export async function createGroup({
  eventId,
  categoryId,
  name,
  description,
}: CreateGroupParameters): Promise<string> {
  const normalizedName = name.trim();
  const normalizedDescription = description?.trim();

  if (!eventId || !normalizedName) {
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  }

  const args = normalizedDescription
    ? {
        parent_event_id: categoryId ?? eventId,
        group_name: normalizedName,
        group_description: normalizedDescription,
      }
    : { parent_event_id: categoryId ?? eventId, group_name: normalizedName };
  const { data, error } = await getSupabaseClient().rpc("create_group", args);

  if (error) throwSupabaseError(error, "createGroup");
  return data;
}

export interface ChangeGroupMemberRoleParameters {
  membershipId: string;
  role: AssignableGroupRole;
}

export interface ChangeGroupMemberRoleResult {
  membershipId: string;
  qrRotated: boolean;
}

export async function changeGroupMemberRole({
  membershipId,
  role,
}: ChangeGroupMemberRoleParameters): Promise<ChangeGroupMemberRoleResult> {
  const { data, error } = await getSupabaseClient().rpc(
    "change_group_membership_role",
    toChangeGroupRoleRpcArgs({ membershipId, role })
  );
  if (error) throw mapRoleChangeError(error);
  const result = data[0];
  if (!result) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return {
    membershipId: result.group_membership_id,
    qrRotated: Boolean(result.qr_credential_id),
  };
}
