import type { Status, UserRole } from "@/components";
import type { MockEventMember } from "@/features/events/data/mock-event-members";

export interface MockRecentRollCall {
  id: string;
  name: string;
  date: string;
  attendanceLabel: string;
  status: Extract<Status, "active" | "synced" | "pending sync">;
}

export interface MockGroupInformation {
  label: string;
  value: string;
}

export interface MockGroupMembership {
  memberName: string;
  role: UserRole;
  membershipReference: string;
}

export interface MockGroupDetails {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  description: string;
  userRole: UserRole;
  memberCount: number;
  activeRollCallLabel?: string;
  activeRollCall?: {
    presentCount: number;
    pendingSyncCount: number;
  };
  members: MockEventMember[];
  recentRollCalls: MockRecentRollCall[];
  information: MockGroupInformation[];
  membership: MockGroupMembership;
}

const groupMembers: MockEventMember[] = [
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
];

const baseRollCalls: MockRecentRollCall[] = [
  {
    id: "morning-assembly",
    name: "Morning assembly",
    date: "Today, 8:15 AM",
    attendanceLabel: "24 of 36 present",
    status: "active",
  },
  {
    id: "departure-check",
    name: "Departure check",
    date: "11 August 2026",
    attendanceLabel: "36 of 36 present",
    status: "synced",
  },
];

const groupsById: Record<string, MockGroupDetails> = {
  "bus-2": {
    id: "bus-2",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Bus 2",
    description: "Travel coordination group for assigned members.",
    userRole: "organiser",
    memberCount: 36,
    activeRollCallLabel: "Morning assembly roll call is active",
    activeRollCall: {
      presentCount: 24,
      pendingSyncCount: 3,
    },
    members: groupMembers,
    recentRollCalls: baseRollCalls,
    information: [
      { label: "Meeting point", value: "College main gate" },
      { label: "Reporting time", value: "7:30 AM" },
      { label: "Coordinator", value: "Mathews Joseph" },
    ],
    membership: {
      memberName: "Mathews Joseph",
      role: "organiser",
      membershipReference: "HJR-IV26-BUS2-014",
    },
  },
  "compartment-b4": {
    id: "compartment-b4",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Compartment B4",
    description: "Internal travel group.",
    userRole: "co-organiser",
    memberCount: 28,
    members: groupMembers,
    recentRollCalls: baseRollCalls.slice(1),
    information: [{ label: "Coordinator", value: "Ananya Nair" }],
    membership: {
      memberName: "Mathews Joseph",
      role: "co-organiser",
      membershipReference: "HJR-IV26-B4-022",
    },
  },
  "room-203": {
    id: "room-203",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Room 203",
    description: "Internal accommodation group.",
    userRole: "member",
    memberCount: 12,
    members: groupMembers,
    recentRollCalls: [],
    information: [{ label: "Check-in", value: "After 6:00 PM" }],
    membership: {
      memberName: "Mathews Joseph",
      role: "member",
      membershipReference: "HJR-IV26-R203-008",
    },
  },
  "activity-team-c": {
    id: "activity-team-c",
    eventId: "industrial-visit-2026",
    eventName: "Industrial Visit 2026",
    name: "Activity Team C",
    description: "Internal activity coordination group.",
    userRole: "super organiser",
    memberCount: 18,
    members: groupMembers,
    recentRollCalls: baseRollCalls.slice(1),
    information: [{ label: "Activity", value: "Documentation support" }],
    membership: {
      memberName: "Mathews Joseph",
      role: "super organiser",
      membershipReference: "HJR-IV26-TEAMC-005",
    },
  },
};

export function getMockGroupDetails(
  eventId: string,
  groupId: string
): MockGroupDetails | undefined {
  const group = groupsById[groupId];
  return group?.eventId === eventId ? group : undefined;
}
