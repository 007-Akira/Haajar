import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getEvent } from "../api/event-queries";

export function useEvent(eventId: string | undefined) {
  const { loading, user } = useSession();

  return useQuery({
    queryKey: queryKeys.events.detail(eventId ?? "missing-event", user?.id),
    queryFn: () => getEvent({ eventId: eventId! }),
    enabled: !loading && Boolean(eventId && user),
  });
}
