import { Redirect } from "expo-router";
import type { JSX, ReactNode } from "react";

import { LoadingSkeleton, ScreenContainer } from "@/components";

import { useSession } from "../providers/session-provider";

export interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { loading, session } = useSession();

  if (loading) {
    return (
      <ScreenContainer testID="auth-loading-screen">
        <LoadingSkeleton lines={4} testID="auth-loading-skeleton" />
      </ScreenContainer>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return <>{children}</>;
}
