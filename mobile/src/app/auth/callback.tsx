import { useLocalSearchParams, useRouter } from "expo-router";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { EmptyState, LoadingSkeleton, ScreenContainer } from "@/components";
import { exchangeOAuthCode } from "@/features/auth";
import {
  createSingleUseAction,
  resolvePostAuthRoute,
  safeOAuthCallbackError,
  sanitizeInternalReturnTo,
  type PostAuthRoute,
} from "@/features/auth/services/auth-return";
import {
  clearPendingAuthReturnTo,
  getPendingAuthReturnTo,
} from "@/features/auth/services/pending-auth-return";
import { getProfile } from "@/features/profile/services/profile-service";

export default function AuthCallbackRoute(): JSX.Element {
  const router = useRouter();
  const {
    code,
    error: oauthError,
    error_description: errorDescription,
    returnTo,
  } = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    returnTo?: string;
  }>();
  const [attempt, setAttempt] = useState(0);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const processingAttempt = useRef<string | null>(null);
  const navigateOnce = useRef(
    createSingleUseAction<PostAuthRoute>((route) => {
      if (route.kind === "profile-setup") {
        router.replace({ pathname: "/profile-setup", params: { returnTo: route.returnTo } });
      } else {
        router.replace(route.href as never);
      }
    })
  );
  const safeReturnTo = sanitizeInternalReturnTo(returnTo) ?? undefined;
  const parameterError = oauthError || errorDescription || !code ? safeOAuthCallbackError() : null;

  useEffect(() => {
    if (!code || parameterError) return;
    const attemptKey = `${attempt}`;
    if (processingAttempt.current === attemptKey) return;
    processingAttempt.current = attemptKey;

    void getPendingAuthReturnTo()
      .then(async (pendingReturnTo) => ({
        returnTo: safeReturnTo ?? pendingReturnTo,
        session: await exchangeOAuthCode(code),
      }))
      .then(async ({ returnTo: resolvedReturnTo, session }) => ({
        profile: await getProfile(session.user.id),
        resolvedReturnTo,
      }))
      .then(async ({ profile, resolvedReturnTo }) => {
        const route = resolvePostAuthRoute(Boolean(profile?.profile_completed), resolvedReturnTo);
        if (route.kind === "destination") await clearPendingAuthReturnTo();
        navigateOnce.current(route);
      })
      .catch(() => setCallbackError(safeOAuthCallbackError()));
  }, [attempt, code, parameterError, safeReturnTo]);

  const error = parameterError ?? callbackError;

  return (
    <ScreenContainer testID="oauth-callback-screen">
      {error ? (
        <EmptyState
          actionAccessibilityLabel={
            parameterError ? "Return to Sign In" : "Retry Google sign-in callback"
          }
          actionLabel={parameterError ? "Return to Sign In" : "Retry"}
          description={error}
          onActionPress={() => {
            if (parameterError) {
              router.replace(
                safeReturnTo
                  ? { pathname: "/sign-in", params: { returnTo: safeReturnTo } }
                  : "/sign-in"
              );
            } else {
              setCallbackError(null);
              setAttempt((current) => current + 1);
            }
          }}
          testID="oauth-callback-error"
          title="Sign-in could not finish"
        />
      ) : (
        <LoadingSkeleton lines={3} testID="oauth-callback-loading" />
      )}
    </ScreenContainer>
  );
}
