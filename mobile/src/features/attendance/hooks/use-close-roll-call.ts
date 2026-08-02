import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useSession } from "@/features/auth";

import { closeRollCall } from "../api/attendance-mutations";
import { getCloseRollCallCacheTargets } from "../config/attendance-cache";
import { createMutationGuard } from "../config/mutation-guard";
import type { CloseRollCallResult } from "../types/attendance-contracts";
import { duplicateMutationError } from "./utils";

export interface CloseRollCallInput {
  rollCallId: string;
  groupId: string;
}

export function useCloseRollCall() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [guard] = useState(createMutationGuard);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: ({ rollCallId }: CloseRollCallInput) => closeRollCall(rollCallId),
    onSuccess: async (_result, variables) => {
      if (!user?.id) return;
      await Promise.all(
        getCloseRollCallCacheTargets({ ...variables, userId: user.id }).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, exact: true })
        )
      );
    },
  });

  async function submit(input: CloseRollCallInput): Promise<CloseRollCallResult> {
    if (!guard.tryStart()) throw duplicateMutationError();
    try {
      return await mutation.mutateAsync(input);
    } finally {
      guard.finish();
    }
  }

  return {
    closeRollCall: submit,
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
