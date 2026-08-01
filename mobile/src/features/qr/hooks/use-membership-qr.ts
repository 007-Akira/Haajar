import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getMembershipQr } from "../api/qr-queries";
import type { MembershipQr } from "../types/qr-models";

const missingScope = "missing-scope";

export function useMembershipQr(membershipId?: string, active = true) {
  const { loading, user } = useSession();
  return useQuery<MembershipQr>({
    queryKey: queryKeys.qr.membership(membershipId ?? missingScope, user?.id ?? missingScope),
    queryFn: () => getMembershipQr(membershipId!),
    enabled: !loading && active && Boolean(membershipId && user?.id),
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  });
}
