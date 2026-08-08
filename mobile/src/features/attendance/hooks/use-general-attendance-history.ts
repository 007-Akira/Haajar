import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getGeneralAttendanceHistory } from "../api/attendance-queries";

export function useGeneralAttendanceHistory(eventId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.attendance.generalHistory(
      eventId ?? "missing-event",
      user?.id ?? "missing-user"
    ),
    queryFn: () => getGeneralAttendanceHistory(eventId!),
    enabled: !loading && Boolean(eventId && user?.id),
  });
}
