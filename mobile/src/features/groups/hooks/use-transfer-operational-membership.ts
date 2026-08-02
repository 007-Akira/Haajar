import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";
import { transferOperationalGroupMembership } from "../api/group-mutations";

export function useTransferOperationalMembership(input: {
  eventId: string;
  categoryId: string;
  sourceGroupId: string;
  membershipId: string;
  affectedUserId: string;
}) {
  const { user } = useSession();
  const client = useQueryClient();
  const busy = useRef(false);
  const mutation = useMutation({
    mutationFn: (targetGroupId: string) =>
      transferOperationalGroupMembership({ membershipId: input.membershipId, targetGroupId }),
    onSuccess: async (result) => {
      if (!user) return;
      await Promise.all([
        client.invalidateQueries({
          queryKey: queryKeys.events.groups(input.eventId, user.id),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: queryKeys.groups.detail(input.categoryId, user.id),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: queryKeys.groups.members(input.sourceGroupId, user.id),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: queryKeys.groups.members(result.target_group_id, user.id),
          exact: true,
        }),
        client.invalidateQueries({
          queryKey: queryKeys.groups.memberDetail(input.sourceGroupId, input.membershipId, user.id),
          exact: true,
        }),
        ...(input.affectedUserId === user.id
          ? [client.invalidateQueries({ queryKey: queryKeys.memberships.all })]
          : []),
      ]);
    },
  });
  return {
    ...mutation,
    transfer: async (targetGroupId: string) => {
      if (busy.current) throw new Error("Transfer already in progress.");
      busy.current = true;
      try {
        return await mutation.mutateAsync(targetGroupId);
      } finally {
        busy.current = false;
      }
    },
  };
}
