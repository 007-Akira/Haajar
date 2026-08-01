import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";
import { getEventMemberDetail } from "../api/event-queries";

export function useEventMemberDetail(eventId?: string, memberId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.events.memberDetail(
      eventId ?? "missing-event",
      memberId ?? "missing-member",
      user?.id ?? "missing-user"
    ),
    queryFn: () => getEventMemberDetail(eventId!, memberId!),
    enabled: !loading && Boolean(eventId && memberId && user?.id),
  });
}
