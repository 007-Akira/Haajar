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
}

export interface UserGroupSummary extends GroupSummary {
  eventName: EventRow["name"] | null;
  currentRole: GroupMembershipRow["role"];
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
