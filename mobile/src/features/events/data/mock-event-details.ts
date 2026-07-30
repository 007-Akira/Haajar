import type { UserRole } from "@/components";

export interface MockEventGroup {
  id: string;
  name: string;
  memberCount: number;
  userRole: UserRole;
  activeRollCall?: boolean;
}

export interface MockEventDetails {
  id: string;
  name: string;
  dateOrStatus?: string;
  participantCount: number;
  userRole: UserRole;
  activeRollCallLabel?: string;
  groups: MockEventGroup[];
}

export type MockEventDetailsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; event: MockEventDetails };

const industrialVisit: MockEventDetails = {
  id: "industrial-visit-2026",
  name: "Industrial Visit 2026",
  dateOrStatus: "12–15 August 2026",
  participantCount: 128,
  userRole: "organiser",
  activeRollCallLabel: "Morning assembly roll call is active",
  groups: [
    {
      id: "bus-2",
      name: "Bus 2",
      memberCount: 36,
      userRole: "organiser",
      activeRollCall: true,
    },
    {
      id: "compartment-b4",
      name: "Compartment B4",
      memberCount: 28,
      userRole: "co-organiser",
    },
    {
      id: "room-203",
      name: "Room 203",
      memberCount: 12,
      userRole: "member",
    },
    {
      id: "activity-team-c",
      name: "Activity Team C",
      memberCount: 18,
      userRole: "super organiser",
    },
  ],
};

const eventsById: Record<string, MockEventDetails> = {
  [industrialVisit.id]: industrialVisit,
};

export function getMockEventDetails(
  eventId: string,
  requestedState?: string
): MockEventDetailsState {
  if (requestedState === "loading") {
    return { status: "loading" };
  }

  if (requestedState === "error") {
    return { status: "error", message: "The trip preview could not be loaded." };
  }

  const event = eventsById[eventId];

  if (!event) {
    return { status: "error", message: "This mock trip does not exist." };
  }

  return { status: "ready", event };
}

export function findMockGroup(eventId: string, groupId: string): MockEventGroup | undefined {
  return eventsById[eventId]?.groups.find((group) => group.id === groupId);
}

export function canShowOrganiserActions(role: UserRole): boolean {
  return role === "organiser" || role === "super organiser";
}
