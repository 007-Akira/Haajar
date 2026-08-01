import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { listGroupMembers } from "../api/group-queries";
import { useGroupMembership } from "./use-group-membership";

export function useGroupMembers(groupId: string | undefined) {
  const { user } = useSession();
  const membershipQuery = useGroupMembership(groupId);

  return useQuery({
    queryKey: queryKeys.groups.members(groupId ?? "missing-group", user?.id),
    queryFn: () => listGroupMembers({ groupId: groupId! }),
    enabled: Boolean(groupId && user) && membershipQuery.data?.status === "active",
  });
}
