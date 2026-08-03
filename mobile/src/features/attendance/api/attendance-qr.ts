import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import { throwAttendanceSupabaseError } from "./attendance-error-mapper";
import type {
  AttendanceMutationResult,
  AttendanceQrResolution,
  AttendanceQrResolutionStatus,
  MarkAttendanceRosterRpcRow,
  ResolveAttendanceQrRpcRow,
} from "../types/attendance-contracts";

const statuses = new Set<AttendanceQrResolutionStatus>([
  "valid",
  "invalid_qr",
  "revoked",
  "wrong_unit",
  "wrong_group",
  "not_in_roster",
  "inactive_membership",
  "closed_unit",
  "archived",
  "unauthorised",
]);

export async function resolveAttendanceQr(input: {
  attendanceUnitId: string;
  presentedToken: string;
}): Promise<AttendanceQrResolution> {
  const { data, error } = await getSupabaseClient().rpc("resolve_attendance_qr", {
    attendance_unit_id: input.attendanceUnitId,
    presented_token: input.presentedToken,
  });
  if (error) throwAttendanceSupabaseError(error, "resolveAttendanceQr");
  const row = data[0];
  if (!row) throw responseError();
  return mapResolution(row);
}

export async function markAttendanceRosterPresent(input: {
  attendanceUnitId: string;
  rosterEntryId: string;
  presentedToken: string;
  clientOperationId: string;
}): Promise<AttendanceMutationResult> {
  const { data, error } = await getSupabaseClient().rpc("mark_attendance_roster_present", {
    attendance_unit_id: input.attendanceUnitId,
    roster_entry_id: input.rosterEntryId,
    presented_token: input.presentedToken,
    client_operation_id: input.clientOperationId,
  });
  if (error) throwAttendanceSupabaseError(error, "markAttendanceRosterPresent");
  const row = data[0];
  if (!row) throw responseError();
  return mapMark(row);
}

export function mapResolution(row: ResolveAttendanceQrRpcRow): AttendanceQrResolution {
  const status = row.resolution_status as AttendanceQrResolutionStatus;
  if (!statuses.has(status)) throw responseError();
  if (status !== "valid") return { status };
  if (
    !row.resolved_attendance_unit_id ||
    !row.roster_entry_id ||
    !row.member_user_id ||
    !row.display_name
  )
    throw responseError();
  return {
    status,
    attendanceUnitId: row.resolved_attendance_unit_id,
    rosterEntryId: row.roster_entry_id,
    memberUserId: row.member_user_id,
    displayName: row.display_name,
    phone: row.phone,
    role: row.role_snapshot ?? "member",
    sourceGroupId: row.source_group_id,
    sourceGroupName: row.source_group_name,
    alreadyMarked: row.already_marked ?? false,
    markedAt: row.marked_at,
  };
}

function mapMark(row: MarkAttendanceRosterRpcRow): AttendanceMutationResult {
  const outcome =
    row.result_status === "marked_present"
      ? "marked"
      : row.result_status === "already_marked"
        ? "already_marked"
        : row.result_status === "closed"
          ? "closed_roll_call"
          : row.result_status === "not_rostered"
            ? "wrong_group"
            : "invalid_qr";
  return {
    outcome,
    attendanceRecordId: row.attendance_record_id,
    membershipId: row.membership_id,
    memberUserId: row.member_user_id,
    markedAt: row.marked_at,
    markingMethod: row.marking_method as "qr" | null,
    changed: outcome === "marked",
  };
}

function responseError(): AppError {
  return new AppError({
    code: appErrorCodes.database,
    message: userSafeErrorMessages[appErrorCodes.database],
    retryable: true,
  });
}
