import type { UserRole } from "@/components";

export type AttendanceStatus = "present" | "unmarked" | "absent";

export interface MockAttendanceMember {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  status: AttendanceStatus;
  markedAt?: string;
}

export interface MockRollCall {
  id: string;
  name: string;
  note?: string;
  groupId: string;
  groupName: string;
  startedAt: string;
  createdBy: string;
  status: "active" | "closed";
  pendingSyncCount: number;
  members: MockAttendanceMember[];
}

export const mockRollCall: MockRollCall = {
  id: "morning-assembly",
  name: "Morning assembly",
  note: "Complete before departure.",
  groupId: "bus-2",
  groupName: "Bus 2",
  startedAt: "Today, 8:15 AM",
  createdBy: "Mathews Joseph",
  status: "active",
  pendingSyncCount: 3,
  members: [
    {
      id: "mathews",
      name: "Mathews",
      phone: "98XXXXXXXX",
      role: "organiser",
      status: "unmarked",
    },
    {
      id: "ananya",
      name: "Ananya Nair",
      phone: "98XXXXXX02",
      role: "co-organiser",
      status: "present",
      markedAt: "8:17 AM",
    },
    {
      id: "fathima",
      name: "Fathima Rahman",
      phone: "98XXXXXX03",
      role: "member",
      status: "unmarked",
    },
    {
      id: "arjun",
      name: "Arjun Menon",
      phone: "98XXXXXX04",
      role: "member",
      status: "present",
      markedAt: "8:18 AM",
    },
  ],
};

export const mockVerificationMember = {
  name: "Mathews",
  phone: "98XXXXXXXX",
  role: "organiser" as UserRole,
  groupName: "Bus 2",
  status: "unmarked" as AttendanceStatus,
  registrationAnswers: [
    { label: "Register number", value: "PTA23CS067" },
    { label: "Batch", value: "2027" },
    { label: "Class", value: "S7 CSE" },
  ],
};

export const rollCallNameExamples = [
  "After boarding the train",
  "Before leaving the hotel",
  "Arrival at destination",
] as const;

export function getMockRollCall(groupId: string, rollCallId: string): MockRollCall {
  return {
    ...mockRollCall,
    id: rollCallId,
    groupId,
  };
}
