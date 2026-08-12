import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { listGroupMembers } from "../api/group-queries";
import { useGroupAccess } from "./use-group-access";

export function useGroupMembers(groupId: string | undefined) {
  const { user } = useSession();
  const accessQuery = useGroupAccess(groupId);

  return useQuery({
    queryKey: queryKeys.groups.members(groupId ?? "missing-group", user?.id),
    queryFn: () => listGroupMembers({ groupId: groupId! }),
    enabled:
      Boolean(groupId && user) && accessQuery.data !== "unauthorised" && Boolean(accessQuery.data),
  });
}
