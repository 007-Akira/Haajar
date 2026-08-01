import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { listEventMembers } from "../api/event-queries";
import { useEventMembership } from "./use-event-membership";

export function useEventMembers(eventId: string | undefined) {
  const { user } = useSession();
  const membershipQuery = useEventMembership(eventId);

  return useQuery({
    queryKey: queryKeys.events.members(eventId ?? "missing-event", user?.id),
    queryFn: () => listEventMembers({ eventId: eventId! }),
    enabled: Boolean(eventId && user) && membershipQuery.data?.status === "active",
  });
}
