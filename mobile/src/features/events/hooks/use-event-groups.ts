import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { listEventGroups } from "@/features/groups/api/group-queries";
import { queryKeys } from "@/lib/query";

import { useEventMembership } from "./use-event-membership";

export function useEventGroups(eventId: string | undefined) {
  const { user } = useSession();
  const membershipQuery = useEventMembership(eventId);

  return useQuery({
    queryKey: queryKeys.events.groups(eventId ?? "missing-event", user?.id),
    queryFn: () =>
      listEventGroups({
        eventId: eventId!,
        userId: user!.id,
        eventRole: membershipQuery.data!.role,
      }),
    enabled:
      Boolean(eventId && user) &&
      membershipQuery.data?.status === "active" &&
      Boolean(membershipQuery.data.role),
  });
}
