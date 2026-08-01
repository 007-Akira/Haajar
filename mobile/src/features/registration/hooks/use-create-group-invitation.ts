import { useMutation } from "@tanstack/react-query";

import { createGroupInvitation } from "../api/registration-mutations";

export function useCreateGroupInvitation(groupId: string) {
  return useMutation({
    mutationFn: () => createGroupInvitation(groupId),
    gcTime: 0,
  });
}
