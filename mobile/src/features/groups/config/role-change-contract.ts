import { AppError, appErrorCodes, mapSupabaseError } from "@/lib/errors";

import type { AssignableGroupRole } from "./role-management";

export interface ChangeGroupRoleContractParameters {
  membershipId: string;
  role: AssignableGroupRole;
}

interface BackendErrorLike {
  message?: string;
}

export function toChangeGroupRoleRpcArgs(parameters: ChangeGroupRoleContractParameters) {
  return {
    target_membership_id: parameters.membershipId,
    new_role: parameters.role,
  } as const;
}

export function mapRoleChangeError(error: unknown): AppError {
  const message =
    typeof error === "object" && error !== null
      ? ((error as BackendErrorLike).message?.toLowerCase() ?? "")
      : "";
  if (message.includes("last") && message.includes("organiser")) {
    return new AppError({
      code: appErrorCodes.conflict,
      message: "The group must keep at least one organiser.",
    });
  }
  if (message.includes("own role")) {
    return new AppError({
      code: appErrorCodes.permissionDenied,
      message: "You cannot change your own group role.",
    });
  }
  if (message.includes("equal or higher") || message.includes("only an event super organiser")) {
    return new AppError({
      code: appErrorCodes.permissionDenied,
      message: "Only a super organiser can make that role change.",
    });
  }
  return mapSupabaseError(error, "changeGroupMemberRole");
}
