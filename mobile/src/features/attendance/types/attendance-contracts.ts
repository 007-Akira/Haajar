import type { Database, Json } from "@/types/database.types";

export type RollCallRow = Database["public"]["Tables"]["roll_calls"]["Row"];
export type RollCallRosterRow = Database["public"]["Tables"]["roll_call_roster_members"]["Row"];
export type AttendanceRecordRow = Database["public"]["Tables"]["attendance_records"]["Row"];

export type RollCallStatus = "active" | "closed";
export type AttendanceMarkingMethod = "qr" | "manual" | "offline_sync";
export type AttendanceMarkResultStatus =
  | "marked_present"
  | "already_marked"
  | "closed"
  | "archived"
  | "invalid"
  | "revoked"
  | "wrong_group"
  | "inactive_membership"
  | "not_rostered"
  | "unauthorised"
  | "not_found";

export type CreateRollCallRpcArgs = Database["public"]["Functions"]["create_roll_call"]["Args"];
export type ActiveRollCallRpcRow =
  Database["public"]["Functions"]["get_active_roll_call"]["Returns"][number];
export type QrAttendanceRpcArgs =
  Database["public"]["Functions"]["mark_attendance_present"]["Args"];
export type QrAttendanceRpcRow =
  Database["public"]["Functions"]["mark_attendance_present"]["Returns"][number];
export type ManualAttendanceRpcArgs =
  Database["public"]["Functions"]["mark_attendance_manual"]["Args"];
export type ManualAttendanceRpcRow =
  Database["public"]["Functions"]["mark_attendance_manual"]["Returns"][number];
export type CloseRollCallRpcRow =
  Database["public"]["Functions"]["close_roll_call"]["Returns"][number];
export type RollCallDashboardRpcResult = Json;
export type RollCallHistoryRpcRow =
  Database["public"]["Functions"]["get_roll_call_history"]["Returns"][number];

export type CanonicalAttendanceOutcome =
  | "valid"
  | "marked"
  | "already_marked"
  | "wrong_group"
  | "invalid_qr"
  | "revoked"
  | "inactive_membership"
  | "closed_roll_call"
  | "archived"
  | "unauthorised"
  | "network_error";

export interface ActiveRollCall {
  id: string;
  eventId: string;
  groupId: string;
  title: string;
  status: RollCallStatus;
  startedAt: string;
  createdBy: string | null;
  totalRoster: number | null;
  presentCount: number | null;
  remainingCount: number | null;
  canScan: boolean;
  canManage: boolean;
}

export type DashboardMemberStatus = "present" | "unmarked" | "absent";

export interface RollCallDashboardMember {
  membershipId: string;
  userId: string;
  displayName: string;
  phone: string | null;
  role: string;
  status: DashboardMemberStatus;
  markedAt: string | null;
  markingMethod: AttendanceMarkingMethod | null;
  markedBy?: string | null;
  markedByName?: string | null;
}

export interface RollCallHistoryItem {
  id: string;
  eventId: string;
  groupId: string;
  title: string;
  status: RollCallStatus;
  startedAt: string;
  closedAt: string | null;
  createdBy: string;
  createdByName: string;
  totalRoster: number;
  presentCount: number;
  remainingCount: number;
}

export interface RollCallDashboard {
  rollCall: {
    id: string;
    eventId: string;
    groupId: string;
    title: string;
    note: string | null;
    status: RollCallStatus;
    startedAt: string;
    closedAt: string | null;
    createdBy: string | null;
    createdByName?: string | null;
    closedByName?: string | null;
  };
  counts: { totalRoster: number; present: number; remaining: number } | null;
  presentMembers: RollCallDashboardMember[];
  remainingMembers: RollCallDashboardMember[];
  permissions: {
    canScan: boolean;
    canMarkManually: boolean;
    canClose: boolean;
    canViewFullHistory?: boolean;
  };
}

export interface AttendanceMutationResult {
  outcome: Exclude<CanonicalAttendanceOutcome, "valid" | "network_error">;
  attendanceRecordId: string | null;
  membershipId: string | null;
  memberUserId: string | null;
  markedAt: string | null;
  markingMethod: AttendanceMarkingMethod | null;
  changed: boolean;
}

export interface CloseRollCallResult {
  rollCallId: string;
  totalRoster: number;
  presentCount: number;
  remainingCount: number;
  closedAt: string;
}

export interface CreateRollCallParameters {
  groupId: string;
  title: string;
  note?: string;
}

export interface MarkQrAttendanceParameters {
  rollCallId: string;
  presentedToken: string;
  clientOperationId: string;
}

export interface MarkManualAttendanceParameters {
  rollCallId: string;
  membershipId: string;
  clientOperationId: string;
}
