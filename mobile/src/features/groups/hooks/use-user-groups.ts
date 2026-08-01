import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { listMyGroupOverview } from "../api/group-queries";

export function useUserGroups() {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.groups.list(user?.id ?? "missing-user"),
    queryFn: listMyGroupOverview,
    enabled: !loading && Boolean(user?.id),
  });
}
