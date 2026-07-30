export interface SupabaseEnvironment {
  url: string;
  anonKey: string;
}

export class SupabaseEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseEnvironmentError";
  }
}

export function getSupabaseEnvironment(): SupabaseEnvironment {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new SupabaseEnvironmentError(
      "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Supabase URL must use HTTPS.");
    }
  } catch {
    throw new SupabaseEnvironmentError("EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  }

  return { url, anonKey };
}
