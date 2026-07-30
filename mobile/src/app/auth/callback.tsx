import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";

import { EmptyState, LoadingSkeleton, ScreenContainer } from "@/components";
import { exchangeOAuthCode } from "@/features/auth";

export default function AuthCallbackRoute(): JSX.Element {
  const router = useRouter();
  const { code, error_description: errorDescription } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const parameterError =
    errorDescription ?? (!code ? "Google sign-in returned without an authorization code." : null);

  useEffect(() => {
    if (!code || errorDescription) {
      return;
    }

    void exchangeOAuthCode(code)
      .then(() => router.replace("/profile-setup"))
      .catch((callbackError: unknown) => {
        setCallbackError(
          callbackError instanceof Error ? callbackError.message : "Could not complete sign-in."
        );
      });
  }, [code, errorDescription, router]);

  const error = parameterError ?? callbackError;

  return (
    <ScreenContainer testID="oauth-callback-screen">
      {error ? (
        <EmptyState
          actionAccessibilityLabel="Return to Sign In"
          actionLabel="Back to Sign In"
          description={error}
          onActionPress={() => router.replace("/sign-in")}
          testID="oauth-callback-error"
          title="Sign-in could not finish"
        />
      ) : (
        <LoadingSkeleton lines={3} testID="oauth-callback-loading" />
      )}
    </ScreenContainer>
  );
}
