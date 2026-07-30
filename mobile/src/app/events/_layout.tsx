import { Stack } from "expo-router";
import type { JSX } from "react";

import { ProtectedRoute } from "@/features/auth";
import { ProfileCompletionGuard } from "@/features/profile";

export default function EventsLayout(): JSX.Element {
  return (
    <ProtectedRoute>
      <ProfileCompletionGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </ProfileCompletionGuard>
    </ProtectedRoute>
  );
}
