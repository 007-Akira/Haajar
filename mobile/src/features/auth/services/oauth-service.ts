import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";

import { getSupabaseClient } from "@/lib/supabase";

export const AUTH_CALLBACK_URL = "haajar://auth/callback";

WebBrowser.maybeCompleteAuthSession();

export async function exchangeOAuthCode(code: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithGoogle(): Promise<Session | null> {
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
    throw error;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);
  if (result.type !== "success") {
    return null;
  }

  const callbackUrl = new URL(result.url);
  const oauthError = callbackUrl.searchParams.get("error_description");
  const code = callbackUrl.searchParams.get("code");

  if (oauthError) {
    throw new Error(oauthError);
  }

  if (!code) {
    throw new Error("Google sign-in returned without an authorization code.");
  }

  return exchangeOAuthCode(code);
}
