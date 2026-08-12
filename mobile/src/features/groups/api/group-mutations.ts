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

export type AssignmentResult =
  | "assigned"
  | "already_member"
  | "sibling_membership_exists"
  | "not_event_member"
  | "archived"
  | "unauthorised"
  | "invalid_group"
  | "not_found";

export async function assignEventMemberToOperationalGroup(
  groupId: string,
  userId: string
): Promise<AssignmentResult> {
  const { data, error } = await getSupabaseClient().rpc(
    "assign_event_member_to_operational_group",
    {
      target_operational_group_id: groupId,
      target_user_id: userId,
    }
  );
  if (error) throwSupabaseError(error, "assignEventMemberToOperationalGroup");
  return data as AssignmentResult;
}

export async function transferOperationalGroupMembership(input: {
  membershipId: string;
  targetGroupId: string;
}) {
  const { data, error } = await getSupabaseClient().rpc("transfer_operational_group_membership", {
    source_membership_id: input.membershipId,
    target_operational_group_id: input.targetGroupId,
  });
  if (error) throwSupabaseError(error, "transferOperationalGroupMembership");
  const row = data[0];
  if (!row)
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
    });
  return row;
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

export type GroupLifecycleResult =
  | "archived"
  | "deleted"
  | "can_delete"
  | "requires_archive"
  | "active_attendance"
  | "pending_sync"
  | "has_history"
  | "has_children"
  | "unauthorised"
  | "not_found";

export async function updateGroup(input: { groupId: string; name: string; description?: string }) {
  const name = input.name.trim();
  if (!name)
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  const { error } = await getSupabaseClient().rpc("update_group", {
    target_group_id: input.groupId,
    group_name: name,
    group_description: input.description?.trim() ?? "",
  });
  if (error) throwSupabaseError(error, "updateGroup");
}

export async function archiveGroup(groupId: string): Promise<GroupLifecycleResult> {
  const { data, error } = await getSupabaseClient().rpc("archive_group", {
    target_group_id: groupId,
  });
  if (error) throwSupabaseError(error, "archiveGroup");
  return data as GroupLifecycleResult;
}
export async function getGroupDeleteEligibility(groupId: string): Promise<GroupLifecycleResult> {
  const { data, error } = await getSupabaseClient().rpc("get_group_delete_eligibility", {
    target_group_id: groupId,
  });
  if (error) throwSupabaseError(error, "getGroupDeleteEligibility");
  return data as GroupLifecycleResult;
}
export async function deleteGroup(groupId: string): Promise<GroupLifecycleResult> {
  const { data, error } = await getSupabaseClient().rpc("delete_group", {
    target_group_id: groupId,
  });
  if (error) throwSupabaseError(error, "deleteGroup");
  return data as GroupLifecycleResult;
}
export async function setMyGroupArchived(groupId: string, archived: boolean): Promise<void> {
  const { error } = await getSupabaseClient().rpc("set_my_group_archived", {
    target_group_id: groupId,
    archived,
  });
  if (error) throwSupabaseError(error, "setMyGroupArchived");
}
