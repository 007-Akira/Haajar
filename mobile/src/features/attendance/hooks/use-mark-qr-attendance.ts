import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useSession } from "@/features/auth";
import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";

import { markQrAttendance } from "../api/attendance-mutations";
import { getAttendanceMarkCacheTargets } from "../config/attendance-cache";
import { createClientOperationId } from "../config/client-operation-id";
import { createEphemeralSecretStore } from "../config/ephemeral-secret";
import { createMutationGuard } from "../config/mutation-guard";
import type { AttendanceMutationResult } from "../types/attendance-contracts";
import { duplicateMutationError } from "./utils";

interface SafeQrMutationVariables {
  rollCallId: string;
  groupId: string;
  clientOperationId: string;
}

export interface MarkQrAttendanceInput {
  rollCallId: string;
  groupId: string;
  presentedToken: string;
  clientOperationId?: string;
}

export function useMarkQrAttendance() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [guard] = useState(createMutationGuard);
  const [tokenStore] = useState(createEphemeralSecretStore);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async (variables: SafeQrMutationVariables) => {
      const presentedToken = tokenStore.take();
      if (!presentedToken) {
        throw new AppError({
          code: appErrorCodes.validation,
          message: userSafeErrorMessages[appErrorCodes.validation],
        });
      }
      try {
        return await markQrAttendance({
          rollCallId: variables.rollCallId,
          presentedToken,
          clientOperationId: variables.clientOperationId,
        });
      } finally {
        tokenStore.clear();
      }
    },
    onSuccess: async (result, variables) => {
      if (!user?.id || !["marked", "already_marked"].includes(result.outcome)) return;
      await Promise.all(
        getAttendanceMarkCacheTargets({
          ...variables,
          membershipId: result.membershipId,
          changed: result.changed,
          userId: user.id,
        }).map((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true }))
      );
    },
    onSettled: () => {
      tokenStore.clear();
    },
  });

  useEffect(
    () => () => {
      tokenStore.clear();
    },
    [tokenStore]
  );

  async function submit(input: MarkQrAttendanceInput): Promise<AttendanceMutationResult> {
    if (!guard.tryStart()) throw duplicateMutationError();
    tokenStore.set(input.presentedToken);
    try {
      return await mutation.mutateAsync({
        rollCallId: input.rollCallId,
        groupId: input.groupId,
        clientOperationId: input.clientOperationId ?? createClientOperationId(),
      });
    } finally {
      tokenStore.clear();
      guard.finish();
    }
  }

  return {
    markQrAttendance: submit,
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
