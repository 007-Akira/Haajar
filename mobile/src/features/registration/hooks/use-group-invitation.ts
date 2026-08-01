import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { resolveGroupInvitation } from "../api/registration-queries";
import { fingerprintJoinToken } from "../types/registration-models";

export function useGroupInvitation(token: string) {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.registration.invitation(
      fingerprintJoinToken(token),
      user?.id ?? "anonymous"
    ),
    queryFn: () => resolveGroupInvitation(token),
    enabled: !loading && Boolean(token.trim()),
  });
}
