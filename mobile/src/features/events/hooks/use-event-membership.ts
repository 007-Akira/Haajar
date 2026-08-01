import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { getCurrentEventMembership } from "@/features/memberships/api/membership-queries";
import { queryKeys } from "@/lib/query";

export function useEventMembership(eventId: string | undefined) {
  const { loading: sessionLoading, user } = useSession();
  const userId = user?.id;
  const query = useQuery({
    queryKey: queryKeys.memberships.currentEvent(
      eventId ?? "missing-event",
      userId ?? "missing-user"
    ),
    queryFn: () => getCurrentEventMembership({ eventId: eventId!, userId: userId! }),
    enabled: !sessionLoading && Boolean(eventId && userId),
  });

  return {
    ...query,
    sessionLoading,
    sessionMissing: !sessionLoading && !userId,
  };
}
