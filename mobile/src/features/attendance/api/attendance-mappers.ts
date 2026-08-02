import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";
import type { Json } from "@/types/database.types";

import type {
  ActiveRollCall,
  ActiveRollCallRpcRow,
  AttendanceMarkingMethod,
  AttendanceMutationResult,
  CanonicalAttendanceOutcome,
  CloseRollCallResult,
  CloseRollCallRpcRow,
  ManualAttendanceRpcRow,
  QrAttendanceRpcRow,
  RollCallDashboard,
  RollCallDashboardMember,
  RollCallHistoryItem,
  RollCallHistoryRpcRow,
} from "../types/attendance-contracts";

type AttendanceRpcRow = QrAttendanceRpcRow | ManualAttendanceRpcRow;

const resultCodeMap: Record<string, AttendanceMutationResult["outcome"]> = {
  marked_present: "marked",
  already_marked: "already_marked",
  wrong_group: "wrong_group",
  invalid: "invalid_qr",
  revoked: "revoked",
  inactive_membership: "inactive_membership",
  not_rostered: "inactive_membership",
  closed: "closed_roll_call",
  archived: "archived",
  unauthorised: "unauthorised",
  not_found: "invalid_qr",
};

export function mapAttendanceResultCode(code: string): CanonicalAttendanceOutcome {
  if (code === "valid") return "valid";
  const outcome = resultCodeMap[code];
  if (outcome) return outcome;
  throw invalidResponseError();
}

export function mapAttendanceMutationResult(row: AttendanceRpcRow): AttendanceMutationResult {
  const outcome = mapAttendanceResultCode(row.result_status);
  if (outcome === "valid" || outcome === "network_error") throw invalidResponseError();
  const method =
    "resolved_marking_method" in row ? row.resolved_marking_method : row.marking_method;
  return {
    outcome,
    attendanceRecordId: row.attendance_record_id ?? null,
    membershipId: row.membership_id ?? null,
    memberUserId: row.member_user_id ?? null,
    markedAt: row.marked_at ?? null,
    markingMethod: isMarkingMethod(method) ? method : null,
    changed: outcome === "marked",
  };
}

export function mapActiveRollCall(row: ActiveRollCallRpcRow): ActiveRollCall {
  if (!row.roll_call_id || !row.event_id || !row.group_id || !row.title || !row.started_at) {
    throw invalidResponseError();
  }
  return {
    id: row.roll_call_id,
    eventId: row.event_id,
    groupId: row.group_id,
    title: row.title,
    status: row.status === "closed" ? "closed" : "active",
    startedAt: row.started_at,
    createdBy: row.created_by ?? null,
    totalRoster: row.total_roster ?? null,
    presentCount: row.present_count ?? null,
    remainingCount: row.remaining_count ?? null,
    canScan: row.caller_can_scan,
    canManage: row.caller_can_manage,
  };
}

export function mapCloseRollCall(row: CloseRollCallRpcRow): CloseRollCallResult {
  if (!row.roll_call_id || !row.closed_at) throw invalidResponseError();
  return {
    rollCallId: row.roll_call_id,
    totalRoster: row.total_roster,
    presentCount: row.present_count,
    remainingCount: row.remaining_count,
    closedAt: row.closed_at,
  };
}

export function mapRollCallDashboard(value: Json): RollCallDashboard {
  const root = asObject(value);
  const rollCall = asObject(root.roll_call);
  const permissions = asObject(root.permissions);
  const countsValue = root.counts === null ? null : asObject(root.counts);
  const status = rollCall.status;
  if (
    typeof rollCall.id !== "string" ||
    typeof rollCall.event_id !== "string" ||
    typeof rollCall.group_id !== "string" ||
    typeof rollCall.title !== "string" ||
    typeof rollCall.started_at !== "string" ||
    (status !== "active" && status !== "closed")
  ) {
    throw invalidResponseError();
  }

  return {
    rollCall: {
      id: rollCall.id,
      eventId: rollCall.event_id,
      groupId: rollCall.group_id,
      title: rollCall.title,
      note: nullableString(rollCall.note),
      status,
      startedAt: rollCall.started_at,
      closedAt: nullableString(rollCall.closed_at),
      createdBy: nullableString(rollCall.created_by),
      createdByName: nullableString(rollCall.created_by_name),
      closedByName: nullableString(rollCall.closed_by_name),
    },
    counts: countsValue
      ? {
          totalRoster: requiredNumber(countsValue.total_roster),
          present: requiredNumber(countsValue.present),
          remaining: requiredNumber(countsValue.remaining),
        }
      : null,
    presentMembers: mapMembers(root.present_members),
    remainingMembers: mapMembers(root.remaining_members),
    permissions: {
      canScan: permissions.can_scan === true,
      canMarkManually: permissions.can_mark_manually === true,
      canClose: permissions.can_close === true,
      canViewFullHistory: permissions.can_view_full_history === true,
    },
  };
}

function mapMembers(value: Json | undefined): RollCallDashboardMember[] {
  if (!Array.isArray(value)) throw invalidResponseError();
  return value.map((item) => {
    const member = asObject(item);
    if (
      typeof member.membership_id !== "string" ||
      typeof member.user_id !== "string" ||
      typeof member.display_name !== "string" ||
      typeof member.role !== "string" ||
      !["present", "unmarked", "absent"].includes(String(member.status))
    ) {
      throw invalidResponseError();
    }
    return {
      membershipId: member.membership_id,
      userId: member.user_id,
      displayName: member.display_name,
      phone: nullableString(member.phone),
      role: member.role,
      status: member.status as RollCallDashboardMember["status"],
      markedAt: nullableString(member.marked_at),
      markingMethod: isMarkingMethod(member.marking_method) ? member.marking_method : null,
      markedBy: nullableString(member.marked_by),
      markedByName: nullableString(member.marked_by_name),
    };
  });
}

export function mapRollCallHistoryItem(row: RollCallHistoryRpcRow): RollCallHistoryItem {
  if (
    !row.roll_call_id ||
    !row.event_id ||
    !row.group_id ||
    !row.title ||
    !row.started_at ||
    !row.created_by ||
    !row.created_by_name ||
    (row.status !== "active" && row.status !== "closed")
  ) {
    throw invalidResponseError();
  }
  return {
    id: row.roll_call_id,
    eventId: row.event_id,
    groupId: row.group_id,
    title: row.title,
    status: row.status,
    startedAt: row.started_at,
    closedAt: row.closed_at ?? null,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    totalRoster: row.total_roster,
    presentCount: row.present_count,
    remainingCount: row.remaining_count,
  };
}

function asObject(value: Json | undefined): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidResponseError();
  return value;
}

function nullableString(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function requiredNumber(value: Json | undefined): number {
  if (typeof value !== "number") throw invalidResponseError();
  return value;
}

function isMarkingMethod(value: unknown): value is AttendanceMarkingMethod {
  return value === "qr" || value === "manual" || value === "offline_sync";
}

function invalidResponseError(): AppError {
  return new AppError({
    code: appErrorCodes.database,
    message: userSafeErrorMessages[appErrorCodes.database],
    retryable: true,
  });
}
