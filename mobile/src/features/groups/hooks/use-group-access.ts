import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";
import { getGroupAccess } from "../api/group-queries";

export function useGroupAccess(groupId: string | undefined) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.groups.access(groupId ?? "missing-group", user?.id),
    queryFn: () => getGroupAccess(groupId!),
    enabled: !loading && Boolean(groupId && user),
  });
}
