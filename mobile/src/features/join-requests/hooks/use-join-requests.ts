import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import {
  getCurrentJoinRequest,
  getJoinRequestStatusDetail,
  listGroupJoinRequests,
} from "../api/join-request-queries";
import type { JoinRequestStatus } from "../types/join-request-models";

const missingScope = "missing-scope";

export function useJoinRequestStatus(groupId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.joinRequests.status(groupId ?? missingScope, user?.id ?? missingScope),
    queryFn: () => getCurrentJoinRequest(groupId!, user!.id),
    enabled: !loading && Boolean(groupId && user?.id),
  });
}

export function useJoinRequestStatusDetail(requestId?: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.joinRequests.detail(requestId ?? missingScope, user?.id ?? missingScope),
    queryFn: () => getJoinRequestStatusDetail(requestId!),
    enabled: !loading && Boolean(requestId && user?.id),
  });
}

export function usePendingGroupRequests(groupId?: string, enabled = true) {
  return useGroupJoinRequests(groupId, "pending", enabled);
}

export function useGroupJoinRequests(
  groupId: string | undefined,
  status: Exclude<JoinRequestStatus, "cancelled">,
  enabled = true
) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.joinRequests.list(
      groupId ?? missingScope,
      status,
      user?.id ?? missingScope
    ),
    queryFn: () => listGroupJoinRequests(groupId!, status),
    enabled: enabled && !loading && Boolean(groupId && user?.id),
  });
}
