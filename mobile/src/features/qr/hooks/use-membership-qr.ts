import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import type { MembershipQr } from "../types/qr-models";

const missingScope = "missing-scope";

export function useMembershipQr(membershipId?: string) {
  const { user } = useSession();
  return useQuery<MembershipQr | null>({
    queryKey: queryKeys.qr.membership(membershipId ?? missingScope, user?.id ?? missingScope),
    queryFn: async () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
