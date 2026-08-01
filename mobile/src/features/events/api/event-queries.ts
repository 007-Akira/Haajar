import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

import type {
  EventDetail,
  EventMember,
  EventRecord,
  EventSummary,
  HomeEvent,
} from "../types/event";

export interface ListEventsParameters {
  userId: string;
}

export interface GetEventDetailParameters {
  eventId: string;
  userId: string;
}

export interface GetEventParameters {
  eventId: string;
}

export interface ListEventMembersParameters {
  eventId: string;
}

export async function getEvent({ eventId }: GetEventParameters): Promise<EventRecord | null> {
  const { data, error } = await getSupabaseClient()
    .from("events")
    .select("id, name, description, status, created_by, created_at, updated_at")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throwSupabaseError(error, "getEvent");
  return data;
}

export async function countActiveEventMembers({ eventId }: GetEventParameters): Promise<number> {
  const { count, error } = await getSupabaseClient()
    .from("event_members")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "active");

  if (error) throwSupabaseError(error, "countActiveEventMembers");
  return count ?? 0;
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

export async function listHomeEvents({ userId }: ListEventsParameters): Promise<HomeEvent[]> {
  const supabase = getSupabaseClient();
  const membershipsResult = await supabase
    .from("event_members")
    .select("event_id, role")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listHomeEvents.memberships");
  }
  if (membershipsResult.data.length === 0) return [];

  const rolesByEvent = new Map(
    membershipsResult.data.map((membership) => [membership.event_id, membership.role])
  );
  const eventIds = [...rolesByEvent.keys()];
  const [eventsResult, memberCountsResult, groupCountsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, description, status, created_at")
      .in("id", eventIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_members")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "active"),
    supabase.from("groups").select("event_id").in("event_id", eventIds).eq("status", "active"),
  ]);

  if (eventsResult.error) throwSupabaseError(eventsResult.error, "listHomeEvents.events");
  if (memberCountsResult.error) {
    throwSupabaseError(memberCountsResult.error, "listHomeEvents.memberCounts");
  }
  if (groupCountsResult.error) {
    throwSupabaseError(groupCountsResult.error, "listHomeEvents.groupCounts");
  }

  const memberCounts = new Map<string, number>();
  for (const membership of memberCountsResult.data) {
    memberCounts.set(membership.event_id, (memberCounts.get(membership.event_id) ?? 0) + 1);
  }
  const groupCounts = new Map<string, number>();
  for (const group of groupCountsResult.data) {
    groupCounts.set(group.event_id, (groupCounts.get(group.event_id) ?? 0) + 1);
  }

  return eventsResult.data.map((event) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    status: event.status,
    currentRole: rolesByEvent.get(event.id) === "super_organiser" ? "super organiser" : "member",
    activeMemberCount: memberCounts.get(event.id) ?? 0,
    internalGroupCount: groupCounts.get(event.id) ?? 0,
    createdAt: event.created_at,
  }));
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
  const { data, error } = await getSupabaseClient().rpc("list_event_member_directory", {
    target_event_id: eventId,
  });

  if (error) throwSupabaseError(error, "listEventMembers");
  return data.map((member) => ({
    membershipId: member.membership_id,
    userId: member.user_id,
    role: member.event_role,
    internalGroupCount: Number(member.active_internal_group_count),
    profile: {
      id: member.user_id,
      full_name: member.full_name,
      phone: member.phone,
    },
  }));
}
