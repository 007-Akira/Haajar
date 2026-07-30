import { Redirect } from "expo-router";
import type { JSX, ReactNode } from "react";

import { LoadingSkeleton, ScreenContainer } from "@/components";
import { useSession } from "@/features/auth/providers/session-provider";

export interface ProfileCompletionGuardProps {
  children: ReactNode;
}

export function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps): JSX.Element {
  const { profile, profileLoading } = useSession();

  if (profileLoading) {
    return (
      <ScreenContainer testID="profile-loading-screen">
        <LoadingSkeleton lines={3} testID="profile-loading-skeleton" />
      </ScreenContainer>
    );
  }

  if (!profile?.profile_completed) {
    return <Redirect href="/profile-setup" />;
  }

  return <>{children}</>;
}
