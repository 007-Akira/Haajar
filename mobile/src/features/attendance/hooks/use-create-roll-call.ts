import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useSession } from "@/features/auth";

import { createRollCall, type CreateRollCallParameters } from "../api/attendance-mutations";
import { getCreateRollCallCacheTargets } from "../config/attendance-cache";
import { createMutationGuard } from "../config/mutation-guard";
import { duplicateMutationError } from "./utils";

export function useCreateRollCall() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [guard] = useState(createMutationGuard);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: createRollCall,
    onSuccess: async (_rollCallId, variables) => {
      if (!user?.id) return;
      await Promise.all(
        getCreateRollCallCacheTargets(variables.groupId, user.id).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, exact: true })
        )
      );
    },
  });

  async function submit(parameters: CreateRollCallParameters): Promise<string> {
    if (!guard.tryStart()) throw duplicateMutationError();
    try {
      return await mutation.mutateAsync(parameters);
    } finally {
      guard.finish();
    }
  }

  return {
    createRollCall: submit,
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
