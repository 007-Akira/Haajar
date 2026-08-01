import { QueryClient } from "@tanstack/react-query";

import { isAppError } from "@/lib/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (isAppError(error)) return error.retryable && failureCount < 2;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
