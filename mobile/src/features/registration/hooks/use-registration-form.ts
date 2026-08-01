import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { getRegistrationForm } from "../api/registration-queries";

const missingScope = "missing-scope";

export function useRegistrationForm(groupId?: string) {
  const { loading: sessionLoading, user } = useSession();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.registration.form(groupId ?? missingScope, userId ?? missingScope),
    queryFn: () => getRegistrationForm(groupId!),
    enabled: !sessionLoading && Boolean(groupId && userId),
  });
}
