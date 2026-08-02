import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";

import { getSupabaseClient } from "@/lib/supabase";

import { clearPendingAuthReturnTo, savePendingAuthReturnTo } from "./pending-auth-return";

export const AUTH_CALLBACK_URL = "haajar://auth/callback";

let activeExchange: { code: string; promise: Promise<Session> } | null = null;
let completedExchange: { code: string; session: Session } | null = null;

WebBrowser.maybeCompleteAuthSession();

export async function exchangeOAuthCode(code: string): Promise<Session> {
  if (completedExchange?.code === code) return completedExchange.session;
  if (activeExchange?.code === code) return activeExchange.promise;

  const promise = (async (): Promise<Session> => {
    const { data, error } = await getSupabaseClient().auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    completedExchange = { code, session: data.session };
    return data.session;
  })();

  activeExchange = { code, promise };
  try {
    return await promise;
  } finally {
    if (activeExchange?.promise === promise) activeExchange = null;
  }
}

export async function signInWithGoogle(returnTo?: unknown): Promise<Session | null> {
  await savePendingAuthReturnTo(returnTo);
  const { data, error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: AUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    await clearPendingAuthReturnTo();
    throw error;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);
  if (result.type !== "success") {
    await clearPendingAuthReturnTo();
    return null;
  }

  const completedCallbackUrl = new URL(result.url);
  const oauthError = completedCallbackUrl.searchParams.get("error_description");
  const code = completedCallbackUrl.searchParams.get("code");

  if (oauthError) {
    throw new Error("Google sign-in could not be completed.");
  }

  if (!code) {
    throw new Error("Google sign-in returned without an authorization code.");
  }

  return exchangeOAuthCode(code);
}
