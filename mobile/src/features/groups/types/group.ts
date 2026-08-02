import type { Tables } from "@/types/database.types";

type EventRow = Tables<"events">;
type GroupRow = Tables<"groups">;
type GroupMembershipRow = Tables<"group_memberships">;
type ProfileRow = Tables<"profiles">;

export interface GroupSummary {
  id: GroupRow["id"];
  eventId: GroupRow["event_id"];
  name: GroupRow["name"];
  description: GroupRow["description"];
  status: GroupRow["status"];
  createdBy: GroupRow["created_by"];
  createdAt: GroupRow["created_at"];
  updatedAt: GroupRow["updated_at"];
  groupKind: "category" | "operational";
  parentGroupId: string | null;
}

export interface UserGroupSummary extends GroupSummary {
  eventName: EventRow["name"] | null;
  currentRole: GroupMembershipRow["role"];
}

export interface ActiveUserGroup {
  membershipId: string;
  groupId: string;
  groupName: string;
  groupStatus: string;
  eventId: string;
  eventName: string;
  eventStatus: string;
  role: GroupMembershipRow["role"];
  memberCount: number;
  qrAvailable: boolean;
}

export interface UserGroupRequest {
  requestId: string;
  groupId: string;
  groupName: string;
  groupStatus: string;
  eventId: string;
  eventName: string;
  eventStatus: string;
  status: "pending" | "accepted" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface UserGroupOverview {
  activeGroups: ActiveUserGroup[];
  requests: UserGroupRequest[];
}

export interface EventGroupSummary extends GroupSummary {
  currentRole: GroupMembershipRow["role"];
  activeMemberCount: number;
}

export interface GroupDetail extends GroupSummary {
  eventName: EventRow["name"] | null;
  eventStatus: EventRow["status"] | null;
}

export interface GroupMember {
  membershipId: GroupMembershipRow["id"];
  userId: GroupMembershipRow["user_id"];
  role: GroupMembershipRow["role"];
  status: GroupMembershipRow["status"];
  approvedAt: GroupMembershipRow["approved_at"];
  joinedAt: GroupMembershipRow["created_at"];
  profile: Pick<ProfileRow, "id" | "full_name" | "phone"> | null;
}

export type GroupMembershipRole = GroupMembershipRow["role"];
