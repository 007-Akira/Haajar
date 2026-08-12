import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";
import { assignEventMemberToOperationalGroup } from "../api/group-mutations";
import { listOperationalGroupAssignmentCandidates } from "../api/group-queries";

export function useOperationalGroupAssignmentCandidates(
  groupId: string | undefined,
  enabled: boolean
) {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.groups.assignmentCandidates(groupId ?? "missing-group", user?.id),
    queryFn: () => listOperationalGroupAssignmentCandidates(groupId!),
    enabled: Boolean(groupId && user && enabled),
  });
}

export function useAssignEventMemberToOperationalGroup(input: {
  eventId: string;
  groupId: string;
}) {
  const client = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      assignEventMemberToOperationalGroup(input.groupId, targetUserId),
    onSuccess: async (_result, targetUserId) =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.groups.detail(input.groupId, user?.id) }),
        client.invalidateQueries({ queryKey: queryKeys.groups.members(input.groupId, user?.id) }),
        client.invalidateQueries({
          queryKey: queryKeys.groups.assignmentCandidates(input.groupId, user?.id),
        }),
        client.invalidateQueries({ queryKey: queryKeys.events.groups(input.eventId, user?.id) }),
        client.invalidateQueries({ queryKey: queryKeys.events.detail(input.eventId, user?.id) }),
        client.invalidateQueries({
          queryKey: queryKeys.events.memberDetail(
            input.eventId,
            targetUserId,
            user?.id ?? "missing-user"
          ),
        }),
      ]),
  });
}
