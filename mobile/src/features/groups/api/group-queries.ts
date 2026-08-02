import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Json, Tables } from "@/types/database.types";

import type {
  EventGroupSummary,
  GroupDetail,
  GroupMember,
  GroupSummary,
  UserGroupSummary,
  UserGroupOverview,
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

export interface GetGroupMemberParameters {
  groupId: string;
  membershipId: string;
}

function jsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function listMyGroupOverview(): Promise<UserGroupOverview> {
  const { data, error } = await getSupabaseClient().rpc("list_my_group_overview");
  if (error) throwSupabaseError(error, "listMyGroupOverview");
  const overview = jsonObject(data);
  const activeRows = Array.isArray(overview.active_groups) ? overview.active_groups : [];
  const requestRows = Array.isArray(overview.requests) ? overview.requests : [];
  return {
    activeGroups: activeRows.map((raw) => {
      const row = jsonObject(raw);
      return {
        membershipId: String(row.membership_id ?? ""),
        groupId: String(row.group_id ?? ""),
        groupName: String(row.group_name ?? "Group"),
        groupStatus: String(row.group_status ?? "active"),
        eventId: String(row.event_id ?? ""),
        eventName: String(row.event_name ?? "Trip"),
        eventStatus: String(row.event_status ?? "active"),
        role: String(row.role ?? "member") as UserGroupOverview["activeGroups"][number]["role"],
        memberCount: Number(row.member_count ?? 0),
        qrAvailable: row.qr_available === true,
      };
    }),
    requests: requestRows.map((raw) => {
      const row = jsonObject(raw);
      return {
        requestId: String(row.request_id ?? ""),
        groupId: String(row.group_id ?? ""),
        groupName: String(row.group_name ?? "Group"),
        groupStatus: String(row.group_status ?? "active"),
        eventId: String(row.event_id ?? ""),
        eventName: String(row.event_name ?? "Trip"),
        eventStatus: String(row.event_status ?? "active"),
        status: String(row.status ?? "pending") as UserGroupOverview["requests"][number]["status"],
        submittedAt: String(row.submitted_at ?? ""),
        reviewedAt: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
        rejectionReason: typeof row.rejection_reason === "string" ? row.rejection_reason : null,
      };
    }),
  };
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

export async function getGroupMember({
  groupId,
  membershipId,
}: GetGroupMemberParameters): Promise<GroupMember | null> {
  const { data: membership, error: membershipError } = await getSupabaseClient()
    .from("group_memberships")
    .select("*")
    .eq("id", membershipId)
    .eq("group_id", groupId)
    .maybeSingle();
  if (membershipError) throwSupabaseError(membershipError, "getGroupMember.membership");
  if (!membership) return null;

  const { data: profile, error: profileError } = await getSupabaseClient()
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", membership.user_id)
    .maybeSingle();
  if (profileError) throwSupabaseError(profileError, "getGroupMember.profile");

  return {
    membershipId: membership.id,
    userId: membership.user_id,
    role: membership.role,
    status: membership.status,
    approvedAt: membership.approved_at,
    joinedAt: membership.created_at,
    profile,
  };
}
