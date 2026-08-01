import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { countActiveEventMembers } from "../api/event-queries";
import { useEventMembership } from "./use-event-membership";

export function useEventMemberCount(eventId: string | undefined) {
  const { user } = useSession();
  const membershipQuery = useEventMembership(eventId);

  return useQuery({
    queryKey: [
      ...queryKeys.events.members(eventId ?? "missing-event"),
      "count",
      user?.id ?? "anonymous",
    ] as const,
    queryFn: () => countActiveEventMembers({ eventId: eventId! }),
    enabled: Boolean(eventId) && membershipQuery.data?.status === "active",
  });
}
