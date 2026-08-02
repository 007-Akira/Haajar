import { queryKeys } from "@/lib/query";

export interface RoleChangeCacheParameters {
  groupId: string;
  membershipId: string;
  actorUserId: string;
  affectedUserId: string;
}

export function getRoleChangeCacheTargets(parameters: RoleChangeCacheParameters) {
  return {
    invalidate: [
      queryKeys.groups.detail(parameters.groupId, parameters.actorUserId),
      queryKeys.groups.members(parameters.groupId, parameters.actorUserId),
      queryKeys.groups.memberDetail(
        parameters.groupId,
        parameters.membershipId,
        parameters.actorUserId
      ),
    ],
    remove: [queryKeys.qr.membership(parameters.membershipId, parameters.affectedUserId)],
  } as const;
}
