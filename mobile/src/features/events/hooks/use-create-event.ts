import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query";

import { createEvent, type CreateEventParameters } from "../api/event-mutations";

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parameters: CreateEventParameters) => createEvent(parameters),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}
