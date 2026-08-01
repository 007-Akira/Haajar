import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { submitJoinRequest } from "../api/registration-mutations";
import type { RegistrationAnswerInput } from "../types/registration-models";

export function useSubmitJoinRequest(groupId: string) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: RegistrationAnswerInput[]) => submitJoinRequest(groupId, answers),
    onSuccess: async () => {
      if (!user?.id) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.joinRequests.status(groupId, user.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests.all }),
      ]);
    },
  });
}
