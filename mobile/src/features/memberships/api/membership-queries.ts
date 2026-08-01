import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import type { EventMembership, GroupMembership } from "../types/membership";

export interface GetCurrentEventMembershipParameters {
  eventId: string;
  userId: string;
}

export interface GetCurrentGroupMembershipParameters {
  groupId: string;
  userId: string;
}

export async function getCurrentEventMembership({
  eventId,
  userId,
}: GetCurrentEventMembershipParameters): Promise<EventMembership | null> {
  const { data, error } = await getSupabaseClient()
    .from("event_members")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throwSupabaseError(error, "getCurrentEventMembership");
  return data;
}

export async function getCurrentGroupMembership({
  groupId,
  userId,
}: GetCurrentGroupMembershipParameters): Promise<GroupMembership | null> {
  const { data, error } = await getSupabaseClient()
    .from("group_memberships")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throwSupabaseError(error, "getCurrentGroupMembership");
  return data;
}
