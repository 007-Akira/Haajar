import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { toMembershipQr } from "../api/qr-queries";
import { regenerateMembershipQr } from "../api/qr-mutations";

export function useRegenerateMembershipQr(membershipId: string) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: () => regenerateMembershipQr(membershipId),
    onSuccess: (result) => {
      if (!user?.id) return;
      queryClient.setQueryData(
        queryKeys.qr.membership(membershipId, user.id),
        toMembershipQr(membershipId, result)
      );
    },
  });
}
