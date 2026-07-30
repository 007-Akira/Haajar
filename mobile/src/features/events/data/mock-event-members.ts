import type { UserRole } from "@/components";

export interface MockEventMember {
  id: string;
  name: string;
  phone: string;
  eventRole?: UserRole;
  internalGroupCount: number;
}

export type MockEventMembersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; members: MockEventMember[] };

const industrialVisitMembers: MockEventMember[] = [
  {
    id: "mathews-joseph",
    name: "Mathews Joseph",
    phone: "+91 98765 41001",
    eventRole: "organiser",
    internalGroupCount: 2,
  },
  {
    id: "ananya-nair",
    name: "Ananya Nair",
    phone: "+91 98765 41002",
    eventRole: "co-organiser",
    internalGroupCount: 2,
  },
  {
    id: "fathima-rahman",
    name: "Fathima Rahman",
    phone: "+91 98765 41003",
    internalGroupCount: 1,
  },
  {
    id: "arjun-menon",
    name: "Arjun Menon",
    phone: "+91 98765 41004",
    internalGroupCount: 2,
  },
  {
    id: "diya-thomas",
    name: "Diya Thomas",
    phone: "+91 98765 41005",
    internalGroupCount: 1,
  },
  {
    id: "nikhil-rajan",
    name: "Nikhil Rajan",
    phone: "+91 98765 41006",
    internalGroupCount: 1,
  },
  {
    id: "sana-mohammed",
    name: "Sana Mohammed",
    phone: "+91 98765 41007",
    internalGroupCount: 2,
  },
  {
    id: "vivek-kumar",
    name: "Vivek Kumar",
    phone: "+91 98765 41008",
    internalGroupCount: 1,
  },
];

export function getMockEventMembers(
  eventId: string,
  requestedState?: string
): MockEventMembersState {
  if (requestedState === "loading") {
    return { status: "loading" };
  }

  if (requestedState === "error") {
    return { status: "error", message: "The trip roster could not be loaded." };
  }

  if (eventId !== "industrial-visit-2026") {
    return { status: "error", message: "This mock trip roster does not exist." };
  }

  if (requestedState === "empty") {
    return { status: "ready", members: [] };
  }

  return { status: "ready", members: industrialVisitMembers };
}
