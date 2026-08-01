import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getGroup } from "../api/group-queries";

export function useGroup(groupId: string | undefined) {
  const { loading, user } = useSession();

  return useQuery({
    queryKey: queryKeys.groups.detail(groupId ?? "missing-group", user?.id),
    queryFn: () => getGroup({ groupId: groupId! }),
    enabled: !loading && Boolean(groupId && user),
  });
}
