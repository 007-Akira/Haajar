import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query";

import { createGroup, type CreateGroupParameters } from "../api/group-mutations";

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parameters: CreateGroupParameters) => createGroup(parameters),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groups.all }),
      ]);
    },
  });
}
