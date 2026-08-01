import type { Tables } from "@/types/database.types";

type EventRow = Tables<"events">;
type EventMembershipRow = Tables<"event_members">;
type ProfileRow = Tables<"profiles">;

export interface EventSummary {
  id: EventRow["id"];
  name: EventRow["name"];
  description: EventRow["description"];
  status: EventRow["status"];
  createdBy: EventRow["created_by"];
  createdAt: EventRow["created_at"];
  updatedAt: EventRow["updated_at"];
  currentRole: EventMembershipRow["role"];
}

export type EventCardRole = "member" | "super organiser";

export interface HomeEvent {
  id: EventRow["id"];
  name: EventRow["name"];
  description: EventRow["description"];
  status: EventRow["status"];
  currentRole: EventCardRole;
  activeMemberCount: number;
  internalGroupCount: number;
  createdAt: EventRow["created_at"];
}

export type EventRecord = Pick<
  EventRow,
  "id" | "name" | "description" | "status" | "created_by" | "created_at" | "updated_at"
>;

export type EventDetail = EventSummary;

export interface EventMember {
  membershipId: EventMembershipRow["id"];
  userId: EventMembershipRow["user_id"];
  role: EventMembershipRow["role"];
  status: EventMembershipRow["status"];
  joinedAt: EventMembershipRow["created_at"];
  profile: Pick<ProfileRow, "id" | "full_name" | "email" | "phone"> | null;
}
