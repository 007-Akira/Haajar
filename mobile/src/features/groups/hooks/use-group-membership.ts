import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { getCurrentGroupMembership } from "@/features/memberships/api/membership-queries";
import { queryKeys } from "@/lib/query";

export function useGroupMembership(groupId: string | undefined) {
  const { loading: sessionLoading, user } = useSession();
  const userId = user?.id;
  const query = useQuery({
    queryKey: queryKeys.memberships.currentGroup(
      groupId ?? "missing-group",
      userId ?? "missing-user"
    ),
    queryFn: () => getCurrentGroupMembership({ groupId: groupId!, userId: userId! }),
    enabled: !sessionLoading && Boolean(groupId && userId),
  });

  return {
    ...query,
    sessionLoading,
    sessionMissing: !sessionLoading && !userId,
  };
}
