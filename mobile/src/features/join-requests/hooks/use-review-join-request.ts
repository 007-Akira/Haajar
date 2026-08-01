import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { reviewJoinRequest } from "../api/join-request-mutations";
import type { JoinRequestDecision } from "../types/join-request-models";

export interface ReviewJoinRequestVariables {
  requestId: string;
  decision: JoinRequestDecision;
  rejectionReason?: string;
  eventId: string;
  groupId: string;
  applicantUserId: string;
}

export function useReviewJoinRequest() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: ({ requestId, decision, rejectionReason }: ReviewJoinRequestVariables) =>
      reviewJoinRequest(requestId, decision, rejectionReason),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.memberships.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.memberships.affectedByApproval(
            variables.eventId,
            variables.groupId,
            variables.applicantUserId
          ),
        }),
        ...(user?.id
          ? [
              queryClient.invalidateQueries({
                queryKey: queryKeys.joinRequests.pending(variables.groupId, user.id),
              }),
            ]
          : []),
      ]);
    },
  });
}
