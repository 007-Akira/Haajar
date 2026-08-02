import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getRollCallHistory } from "../api/attendance-queries";

export function useRollCallHistory(groupId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.attendance.history(groupId ?? "missing-group", user?.id ?? "missing-user"),
    queryFn: () => getRollCallHistory(groupId!),
    enabled: !loading && Boolean(groupId && user?.id),
  });
}
