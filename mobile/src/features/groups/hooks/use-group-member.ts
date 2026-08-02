import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getGroupMember } from "../api/group-queries";

export function useGroupMember(groupId?: string, membershipId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.groups.memberDetail(
      groupId ?? "missing-group",
      membershipId ?? "missing-membership",
      user?.id ?? "missing-user"
    ),
    queryFn: () => getGroupMember({ groupId: groupId!, membershipId: membershipId! }),
    enabled: !loading && Boolean(groupId && membershipId && user?.id),
  });
}
