import type { UserRole } from "@/components";

export interface MockTrip {
  id: string;
  name: string;
  dateOrStatus: string;
  participantCount: number;
  groupCount: number;
  role: UserRole;
  active?: boolean;
}

export interface MockActiveRollCall {
  tripId: string;
  tripName: string;
  label: string;
}

export const mockTrips: MockTrip[] = [
  {
    id: "industrial-visit-2026",
    name: "Industrial Visit 2026",
    dateOrStatus: "12–15 August 2026",
    participantCount: 128,
    groupCount: 4,
    role: "organiser",
    active: true,
  },
  {
    id: "technical-camp",
    name: "Technical Camp",
    dateOrStatus: "Registration open",
    participantCount: 84,
    groupCount: 3,
    role: "co-organiser",
  },
  {
    id: "college-tour",
    name: "College Tour",
    dateOrStatus: "2 October 2026",
    participantCount: 62,
    groupCount: 2,
    role: "member",
  },
];

export const mockActiveRollCall: MockActiveRollCall = {
  tripId: "industrial-visit-2026",
  tripName: "Industrial Visit 2026",
  label: "Morning assembly roll call is active",
};
