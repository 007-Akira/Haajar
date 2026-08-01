import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";

import type { GroupMember, GroupSummary, UserGroupSummary } from "../types/group";

export interface ListEventGroupsParameters {
  eventId: string;
}

export interface ListUserGroupsParameters {
  userId: string;
}

export interface GetGroupDetailParameters {
  eventId: string;
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
}: ListEventGroupsParameters): Promise<GroupSummary[]> {
  const { data, error } = await getSupabaseClient()
    .from("groups")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throwSupabaseError(error, "listEventGroups");
  return data.map(toSummary);
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

export async function getGroupDetail({
  eventId,
  groupId,
}: GetGroupDetailParameters): Promise<GroupSummary> {
  const { data, error } = await getSupabaseClient()
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("event_id", eventId)
    .single();

  if (error) throwSupabaseError(error, "getGroupDetail");
  return toSummary(data);
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
    .select("id, full_name, email, phone")
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
