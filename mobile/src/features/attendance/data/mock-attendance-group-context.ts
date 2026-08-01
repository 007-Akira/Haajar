import type { UserRole } from "@/components";

interface MockAttendanceGroupContext {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  userRole: UserRole;
}

const groupsById: Record<string, MockAttendanceGroupContext> = {
  "bus-2": {
    id: "bus-2",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Bus 2",
    userRole: "organiser",
  },
  "compartment-b4": {
    id: "compartment-b4",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Compartment B4",
    userRole: "co-organiser",
  },
  "room-203": {
    id: "room-203",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Room 203",
    userRole: "member",
  },
  "activity-team-c": {
    id: "activity-team-c",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Activity Team C",
    userRole: "super organiser",
  },
};

export function getMockAttendanceGroupContext(
  eventId: string,
  groupId: string
): MockAttendanceGroupContext | undefined {
  const group = groupsById[groupId];
  return group?.eventId === eventId ? group : undefined;
}
