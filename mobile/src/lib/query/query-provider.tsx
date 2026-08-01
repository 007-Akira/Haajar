import { QueryClientProvider } from "@tanstack/react-query";
import type { JSX, ReactNode } from "react";

import { queryClient } from "./query-client";

export interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
