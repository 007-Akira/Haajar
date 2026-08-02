import type { Database, Json } from "@/types/database.types";

export type RollCallRow = Database["public"]["Tables"]["roll_calls"]["Row"];
export type RollCallRosterRow = Database["public"]["Tables"]["roll_call_roster_members"]["Row"];
export type AttendanceRecordRow = Database["public"]["Tables"]["attendance_records"]["Row"];

export type RollCallStatus = "active" | "closed";
export type AttendanceMarkingMethod = "qr" | "manual";
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
