import type { Session, User } from "@supabase/supabase-js";
import type { JSX, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getSupabaseClient, type Profile } from "@/lib/supabase";
import { queryClient } from "@/lib/query";
import { revokeCurrentPushDevice } from "@/features/notifications/services/push-notification-service";
import { clearOfflineAttendanceCache } from "@/features/attendance/offline/services/offline-roster-cache";
import {
  getProfile,
  saveProfile as persistProfile,
} from "@/features/profile/services/profile-service";

import { signInWithGoogle as openGoogleSignIn } from "../services/oauth-service";

interface SessionContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  configurationError: string | null;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: (returnTo?: string) => Promise<boolean>;
  saveProfile: (values: { fullName: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function clearSessionSensitiveCaches(): void {
  queryClient.clear();
}

export interface SessionProviderProps {
  children: ReactNode;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected authentication error occurred.";
}

function initializeSupabase(): {
  client: ReturnType<typeof getSupabaseClient> | null;
  error: string | null;
} {
  try {
    return { client: getSupabaseClient(), error: null };
  } catch (error) {
    return { client: null, error: messageFromError(error) };
  }
}

export function SessionProvider({ children }: SessionProviderProps): JSX.Element {
  const [initialization] = useState(initializeSupabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(initialization.client));
  const [profileLoading, setProfileLoading] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(initialization.error);

  const loadProfile = useCallback(async (userId: string): Promise<void> => {
    setProfileLoading(true);
    try {
      setProfile(await getProfile(userId));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = initialization.client;
    if (!supabase) {
      return undefined;
    }

    void supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (error) {
          throw error;
        }
        setSession(data.session);
        if (data.session) {
          void loadProfile(data.session.user.id);
        } else {
          // Local attendance storage is an optional operational cache. A cache
          // cleanup failure must never turn into an authentication/configuration
          // failure or disable Google sign-in.
          await clearOfflineAttendanceCache().catch(() => undefined);
        }
      })
      .catch((error: unknown) => setConfigurationError(messageFromError(error)))
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void loadProfile(nextSession.user.id);
      } else {
        clearSessionSensitiveCaches();
        void clearOfflineAttendanceCache().catch(() => undefined);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialization.client, loadProfile]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (session) {
      await loadProfile(session.user.id);
    }
  }, [loadProfile, session]);

  const handleGoogleSignIn = useCallback(
    async (returnTo?: string): Promise<boolean> => {
      setConfigurationError(null);
      const nextSession = await openGoogleSignIn(returnTo);
      if (!nextSession) {
        return false;
      }
      setSession(nextSession);
      await loadProfile(nextSession.user.id);
      return true;
    },
    [loadProfile]
  );

  const handleSaveProfile = useCallback(
    async (values: { fullName: string; phone: string }): Promise<void> => {
      if (!session) {
        throw new Error("Sign in before completing your profile.");
      }
      setProfile(await persistProfile(session.user, values));
    },
    [session]
  );

  const signOut = useCallback(async (): Promise<void> => {
    await clearOfflineAttendanceCache(session?.user.id);
    await revokeCurrentPushDevice();
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) {
      throw error;
    }
    setSession(null);
    setProfile(null);
    clearSessionSensitiveCaches();
  }, [session?.user.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      configurationError,
      refreshProfile,
      signInWithGoogle: handleGoogleSignIn,
      saveProfile: handleSaveProfile,
      signOut,
    }),
    [
      configurationError,
      handleGoogleSignIn,
      handleSaveProfile,
      loading,
      profile,
      profileLoading,
      refreshProfile,
      session,
      signOut,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }
  return context;
}
