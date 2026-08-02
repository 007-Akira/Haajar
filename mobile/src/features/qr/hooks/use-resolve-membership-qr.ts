import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createEphemeralSecretStore } from "@/features/attendance/config/ephemeral-secret";
import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";

import { resolveMembershipQr } from "../api/qr-queries";
import type { MembershipQrResolution } from "../types/qr-models";

interface SafeResolutionVariables {
  expectedGroupId: string;
}

export interface ResolveMembershipQrInput {
  expectedGroupId: string;
  presentedToken: string;
}

export function useResolveMembershipQr() {
  const [tokenStore] = useState(createEphemeralSecretStore);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async ({ expectedGroupId }: SafeResolutionVariables) => {
      const presentedToken = tokenStore.take();
      if (!presentedToken) {
        throw new AppError({
          code: appErrorCodes.validation,
          message: userSafeErrorMessages[appErrorCodes.validation],
        });
      }
      try {
        return await resolveMembershipQr(presentedToken, expectedGroupId);
      } finally {
        tokenStore.clear();
      }
    },
    onSettled: () => tokenStore.clear(),
  });

  useEffect(() => () => tokenStore.clear(), [tokenStore]);

  async function resolve(input: ResolveMembershipQrInput): Promise<MembershipQrResolution> {
    tokenStore.set(input.presentedToken);
    try {
      return await mutation.mutateAsync({ expectedGroupId: input.expectedGroupId });
    } finally {
      tokenStore.clear();
    }
  }

  return {
    resolveMembershipQr: resolve,
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}
