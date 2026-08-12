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
  GroupAccess,
  OperationalGroupAssignmentCandidate,
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
  const archivedRows = Array.isArray(overview.archived_groups) ? overview.archived_groups : [];
  const requestRows = Array.isArray(overview.requests) ? overview.requests : [];
  const mapGroup = (raw: Json): UserGroupOverview["activeGroups"][number] => {
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
      personallyArchived: row.personally_archived === true,
    };
  };
  return {
    activeGroups: activeRows.map(mapGroup),
    archivedGroups: archivedRows.map(mapGroup),
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

function toSummary(
  group:
    | Tables<"groups">
    | {
        id: string;
        event_id: string;
        name: string;
        description: string | null;
        status: string;
        created_by: string;
        created_at: string;
        updated_at: string;
        group_kind?: string;
        parent_group_id?: string | null;
      }
): GroupSummary {
  const hierarchy = group as Tables<"groups"> & {
    group_kind?: "category" | "operational";
    parent_group_id?: string | null;
  };
  return {
    id: group.id,
    eventId: group.event_id,
    name: group.name,
    description: group.description,
    status: group.status as GroupSummary["status"],
    createdBy: group.created_by,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    groupKind: (hierarchy.group_kind ?? "operational") as GroupSummary["groupKind"],
    parentGroupId: hierarchy.parent_group_id ?? null,
  };
}

export async function listEventGroups({
  eventId,
  userId,
  eventRole,
}: ListEventGroupsParameters): Promise<EventGroupSummary[]> {
  const supabase = getSupabaseClient();
  const groupsResult = await supabase.rpc("list_event_groups_with_participation_counts", {
    target_event_id: eventId,
  });

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

  const rolesByGroup = new Map<string, EventGroupSummary["currentRole"]>();
  for (const membership of membershipsResult.data) {
    if (membership.user_id === userId) rolesByGroup.set(membership.group_id, membership.role);
  }

  return groupsResult.data.map((group) => ({
    ...toSummary(group),
    currentRole:
      eventRole === "super_organiser"
        ? "super_organiser"
        : (rolesByGroup.get(group.id) ?? "member"),
    activeMemberCount: Number(group.active_member_count ?? 0),
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
  const membershipsResult = await getSupabaseClient().rpc("list_group_members_secure", {
    target_group_id: groupId,
  });

  if (membershipsResult.error) {
    throwSupabaseError(membershipsResult.error, "listGroupMembers.memberships");
  }
  return membershipsResult.data.map((membership) => ({
    membershipId: membership.membership_id,
    userId: membership.user_id,
    role: membership.role,
    status: membership.status,
    approvedAt: membership.approved_at,
    joinedAt: membership.joined_at,
    profile: { id: membership.user_id, full_name: membership.full_name, phone: membership.phone },
  }));
}

export async function getGroupAccess(groupId: string): Promise<GroupAccess> {
  const { data, error } = await getSupabaseClient().rpc("get_group_access", {
    target_group_id: groupId,
  });
  if (error) throwSupabaseError(error, "getGroupAccess");
  return data as GroupAccess;
}

export async function listOperationalGroupAssignmentCandidates(
  groupId: string
): Promise<OperationalGroupAssignmentCandidate[]> {
  const { data, error } = await getSupabaseClient().rpc(
    "list_operational_group_assignment_candidates",
    { target_operational_group_id: groupId }
  );
  if (error) throwSupabaseError(error, "listOperationalGroupAssignmentCandidates");
  return data.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    phone: row.phone,
    siblingGroupId: row.sibling_group_id,
    siblingGroupName: row.sibling_group_name,
    siblingMembershipId: row.sibling_membership_id,
  }));
}

export async function getGroupMember({
  groupId,
  membershipId,
}: GetGroupMemberParameters): Promise<GroupMember | null> {
  return (
    (await listGroupMembers({ groupId })).find((member) => member.membershipId === membershipId) ??
    null
  );
}
