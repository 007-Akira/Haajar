import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

import type { EventDetail, EventMember, EventSummary } from "../types/event";

export interface ListEventsParameters {
  userId: string;
}

export interface GetEventDetailParameters {
  eventId: string;
  userId: string;
}

export interface ListEventMembersParameters {
  eventId: string;
}

function toSummary(event: Tables<"events">, currentRole: string): EventSummary {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: event.status,
    createdBy: event.created_by,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    currentRole,
  };
}

export async function listEvents({ userId }: ListEventsParameters): Promise<EventSummary[]> {
  const supabase = getSupabaseClient();
  const membershipsResult = await supabase
    .from("event_members")
    .select("event_id, role")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listEvents.memberships");
  }
  if (membershipsResult.data.length === 0) return [];

  const rolesByEvent = new Map(
    membershipsResult.data.map((membership) => [membership.event_id, membership.role])
  );
  const eventsResult = await supabase
    .from("events")
    .select("*")
    .in("id", [...rolesByEvent.keys()])
    .order("created_at", { ascending: false });

  if (eventsResult.error) throwSupabaseError(eventsResult.error, "listEvents.events");

  return eventsResult.data.map((event) => toSummary(event, rolesByEvent.get(event.id) ?? "member"));
}

export async function getEventDetail({
  eventId,
  userId,
}: GetEventDetailParameters): Promise<EventDetail> {
  const supabase = getSupabaseClient();
  const [eventResult, membershipResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase
      .from("event_members")
      .select("role")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single(),
  ]);

  if (eventResult.error) throwSupabaseError(eventResult.error, "getEventDetail.event");
  if (membershipResult.error) {
    throwSupabaseError(membershipResult.error, "getEventDetail.membership");
  }

  return toSummary(eventResult.data, membershipResult.data.role);
}

export async function listEventMembers({
  eventId,
}: ListEventMembersParameters): Promise<EventMember[]> {
  const supabase = getSupabaseClient();
  const membershipsResult = await supabase
    .from("event_members")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listEventMembers.memberships");
  }
  if (membershipsResult.data.length === 0) return [];

  const profilesResult = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in(
      "id",
      membershipsResult.data.map((membership) => membership.user_id)
    );

  if (profilesResult.error) {
    throwSupabaseError(profilesResult.error, "listEventMembers.profiles");
  }

  const profilesById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  return membershipsResult.data.map((membership) => ({
    membershipId: membership.id,
    userId: membership.user_id,
    role: membership.role,
    status: membership.status,
    joinedAt: membership.created_at,
    profile: profilesById.get(membership.user_id) ?? null,
  }));
}
