import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useSession } from "@/features/auth";

import { markManualAttendance } from "../api/attendance-mutations";
import { getAttendanceMarkCacheTargets } from "../config/attendance-cache";
import { createClientOperationId } from "../config/client-operation-id";
import { createMutationGuard } from "../config/mutation-guard";
import type { AttendanceMutationResult } from "../types/attendance-contracts";
import { duplicateMutationError } from "./utils";

export interface MarkManualAttendanceInput {
  rollCallId: string;
  groupId: string;
  membershipId: string;
  clientOperationId?: string;
}

export function useMarkManualAttendance() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [guard] = useState(createMutationGuard);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (input: MarkManualAttendanceInput) =>
      markManualAttendance({
        rollCallId: input.rollCallId,
        membershipId: input.membershipId,
        clientOperationId: input.clientOperationId ?? createClientOperationId(),
      }),
    onSuccess: async (result, variables) => {
      if (!user?.id || !["marked", "already_marked"].includes(result.outcome)) return;
      await Promise.all(
        getAttendanceMarkCacheTargets({
          groupId: variables.groupId,
          rollCallId: variables.rollCallId,
          membershipId: result.membershipId ?? variables.membershipId,
          changed: result.changed,
          userId: user.id,
        }).map((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true }))
      );
    },
  });

  async function submit(input: MarkManualAttendanceInput): Promise<AttendanceMutationResult> {
    if (!guard.tryStart()) throw duplicateMutationError();
    try {
      return await mutation.mutateAsync(input);
    } finally {
      guard.finish();
    }
  }

  return {
    markManualAttendance: submit,
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
