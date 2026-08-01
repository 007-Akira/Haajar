import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { listHomeEvents } from "../api/event-queries";

const missingUserKey = "no-session";

export function useEvents() {
  const { loading: sessionLoading, user } = useSession();
  const userId = user?.id;
  const query = useQuery({
    queryKey: queryKeys.events.list(userId ?? missingUserKey),
    queryFn: () => listHomeEvents({ userId: userId! }),
    enabled: !sessionLoading && Boolean(userId),
  });

  return {
    ...query,
    sessionLoading,
    sessionMissing: !sessionLoading && !userId,
  };
}
