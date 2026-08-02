import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getActiveRollCall } from "../api/attendance-queries";

export function useActiveRollCall(groupId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.attendance.activeByGroup(
      groupId ?? "missing-group",
      user?.id ?? "missing-user"
    ),
    queryFn: () => getActiveRollCall(groupId!),
    enabled: !loading && Boolean(groupId && user?.id),
  });
}
