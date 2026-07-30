import "react-native-url-polyfill/auto";

import { AppState, Platform } from "react-native";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseEnvironment } from "./env";
import { secureSessionStorage } from "./storage";

let client: SupabaseClient<Database> | undefined;
let appStateListenerAttached = false;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) {
    return client;
  }

  const environment = getSupabaseEnvironment();
  client = createClient<Database>(environment.url, environment.anonKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  });

  if (Platform.OS !== "web" && !appStateListenerAttached) {
    appStateListenerAttached = true;
    AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void client?.auth.startAutoRefresh();
      } else {
        void client?.auth.stopAutoRefresh();
      }
    });
  }

  return client;
}
