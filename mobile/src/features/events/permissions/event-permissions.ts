import type { Tables } from "@/types/database.types";

type EventRole = Tables<"event_members">["role"];
type GroupRole = Tables<"group_memberships">["role"];

export function canManageEvent(role: EventRole): boolean {
  return role === "super_organiser";
}

export function toEventDisplayRole(role: EventRole): "member" | "super organiser" {
  return role === "super_organiser" ? "super organiser" : "member";
}

export function toGroupDisplayRole(
  role: GroupRole
): "member" | "co-organiser" | "organiser" | "super organiser" {
  return role.replaceAll("_", "-").replace("super-organiser", "super organiser") as
    "member" | "co-organiser" | "organiser" | "super organiser";
}
