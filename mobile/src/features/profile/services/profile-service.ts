import type { User } from "@supabase/supabase-js";

import { getSupabaseClient, type Profile } from "@/lib/supabase";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveProfile(
  user: User,
  values: { fullName: string; phone: string }
): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .update({
      full_name: values.fullName.trim(),
      phone: values.phone.trim(),
      profile_completed: true,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
