import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";

import {
  changeGroupMemberRole,
  type ChangeGroupMemberRoleParameters,
} from "../api/group-mutations";
import { getRoleChangeCacheTargets } from "../config/role-change-cache";

export interface GroupRoleChangeVariables extends ChangeGroupMemberRoleParameters {
  groupId: string;
  affectedUserId: string;
}

export function useChangeGroupMemberRole() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, role }: GroupRoleChangeVariables) =>
      changeGroupMemberRole({ membershipId, role }),
    onSuccess: async (_result, variables) => {
      if (!user?.id) return;
      const targets = getRoleChangeCacheTargets({
        ...variables,
        actorUserId: user.id,
      });
      await Promise.all([
        ...targets.invalidate.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, exact: true })
        ),
        ...targets.remove.map((queryKey) => queryClient.removeQueries({ queryKey, exact: true })),
      ]);
    },
  });
}
