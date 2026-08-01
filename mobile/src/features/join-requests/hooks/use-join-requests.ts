import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getCurrentJoinRequest, listPendingJoinRequests } from "../api/join-request-queries";

const missingScope = "missing-scope";

export function useJoinRequestStatus(groupId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.joinRequests.status(groupId ?? missingScope, user?.id ?? missingScope),
    queryFn: () => getCurrentJoinRequest(groupId!, user!.id),
    enabled: !loading && Boolean(groupId && user?.id),
  });
}

export function usePendingGroupRequests(groupId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.joinRequests.pending(groupId ?? missingScope, user?.id ?? missingScope),
    queryFn: () => listPendingJoinRequests(groupId!),
    enabled: !loading && Boolean(groupId && user?.id),
  });
}
