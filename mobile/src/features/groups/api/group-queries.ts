import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

import type {
  EventGroupSummary,
  GroupDetail,
  GroupMember,
  GroupSummary,
  UserGroupSummary,
} from "../types/group";

export interface ListEventGroupsParameters {
  eventId: string;
  userId: string;
  eventRole: string;
}

export interface ListUserGroupsParameters {
  userId: string;
}

export interface GetGroupParameters {
  groupId: string;
}

export interface ListGroupMembersParameters {
  groupId: string;
}

function toSummary(group: Tables<"groups">): GroupSummary {
  return {
    id: group.id,
    eventId: group.event_id,
    name: group.name,
    description: group.description,
    status: group.status,
    createdBy: group.created_by,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

export async function listEventGroups({
  eventId,
  userId,
  eventRole,
}: ListEventGroupsParameters): Promise<EventGroupSummary[]> {
  const supabase = getSupabaseClient();
  const groupsResult = await supabase
    .from("groups")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (groupsResult.error) throwSupabaseError(groupsResult.error, "listEventGroups.groups");
  if (groupsResult.data.length === 0) return [];

  const groupIds = groupsResult.data.map((group) => group.id);
  const membershipsResult = await supabase
    .from("group_memberships")
    .select("group_id, user_id, role")
    .in("group_id", groupIds)
    .eq("status", "active");

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listEventGroups.memberships");
  }

  const memberCounts = new Map<string, number>();
  const rolesByGroup = new Map<string, EventGroupSummary["currentRole"]>();
  for (const membership of membershipsResult.data) {
    memberCounts.set(membership.group_id, (memberCounts.get(membership.group_id) ?? 0) + 1);
    if (membership.user_id === userId) rolesByGroup.set(membership.group_id, membership.role);
  }

  return groupsResult.data.map((group) => ({
    ...toSummary(group),
    currentRole:
      eventRole === "super_organiser"
        ? "super_organiser"
        : (rolesByGroup.get(group.id) ?? "member"),
    activeMemberCount: memberCounts.get(group.id) ?? 0,
  }));
}

export async function listUserGroups({
  userId,
}: ListUserGroupsParameters): Promise<UserGroupSummary[]> {
  const supabase = getSupabaseClient();
  const membershipsResult = await supabase
    .from("group_memberships")
    .select("group_id, role")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listUserGroups.memberships");
  }
  if (membershipsResult.data.length === 0) return [];

  const rolesByGroup = new Map(
    membershipsResult.data.map((membership) => [membership.group_id, membership.role])
  );
  const groupsResult = await supabase
    .from("groups")
    .select("*")
    .in("id", [...rolesByGroup.keys()])
    .order("created_at", { ascending: false });

  if (groupsResult.error) throwSupabaseError(groupsResult.error, "listUserGroups.groups");
  if (groupsResult.data.length === 0) return [];

  const eventIds = [...new Set(groupsResult.data.map((group) => group.event_id))];
  const eventsResult = await supabase.from("events").select("id, name").in("id", eventIds);
  if (eventsResult.error) throwSupabaseError(eventsResult.error, "listUserGroups.events");

  const eventNamesById = new Map(eventsResult.data.map((event) => [event.id, event.name]));
  return groupsResult.data.map((group) => ({
    ...toSummary(group),
    eventName: eventNamesById.get(group.event_id) ?? null,
    currentRole: rolesByGroup.get(group.id) ?? "member",
  }));
}

export async function getGroup({ groupId }: GetGroupParameters): Promise<GroupDetail | null> {
  const supabase = getSupabaseClient();
  const groupResult = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();

  if (groupResult.error) throwSupabaseError(groupResult.error, "getGroup.group");
  if (!groupResult.data) return null;

  const eventResult = await supabase
    .from("events")
    .select("name, status")
    .eq("id", groupResult.data.event_id)
    .maybeSingle();

  if (eventResult.error) throwSupabaseError(eventResult.error, "getGroup.event");
  return {
    ...toSummary(groupResult.data),
    eventName: eventResult.data?.name ?? null,
    eventStatus: eventResult.data?.status ?? null,
  };
}

export async function listGroupMembers({
  groupId,
}: ListGroupMembersParameters): Promise<GroupMember[]> {
  const supabase = getSupabaseClient();
  const membershipsResult = await supabase
    .from("group_memberships")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listGroupMembers.memberships");
  }
  if (membershipsResult.data.length === 0) return [];

  const profilesResult = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in(
      "id",
      membershipsResult.data.map((membership) => membership.user_id)
    );

  if (profilesResult.error) {
    throwSupabaseError(profilesResult.error, "listGroupMembers.profiles");
  }

  const profilesById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  return membershipsResult.data.map((membership) => ({
    membershipId: membership.id,
    userId: membership.user_id,
    role: membership.role,
    status: membership.status,
    approvedAt: membership.approved_at,
    joinedAt: membership.created_at,
    profile: profilesById.get(membership.user_id) ?? null,
  }));
}
