import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getRollCallDashboard } from "../api/attendance-queries";

export function useRollCallDashboard(rollCallId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.attendance.dashboard(
      rollCallId ?? "missing-roll-call",
      user?.id ?? "missing-user"
    ),
    queryFn: () => getRollCallDashboard(rollCallId!),
    enabled: !loading && Boolean(rollCallId && user?.id),
  });
}
