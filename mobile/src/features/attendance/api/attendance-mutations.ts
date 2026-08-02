import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import type {
  AttendanceMutationResult,
  CloseRollCallResult,
  CreateRollCallParameters,
  MarkManualAttendanceParameters,
  MarkQrAttendanceParameters,
} from "../types/attendance-contracts";
import {
  toCreateRollCallRpcArgs,
  toManualAttendanceRpcArgs,
  toQrAttendanceRpcArgs,
} from "../config/attendance-rpc-contract";
import { throwAttendanceSupabaseError } from "./attendance-error-mapper";
import { mapAttendanceMutationResult, mapCloseRollCall } from "./attendance-mappers";

export type {
  CreateRollCallParameters,
  MarkManualAttendanceParameters,
  MarkQrAttendanceParameters,
} from "../types/attendance-contracts";

export async function createRollCall(parameters: CreateRollCallParameters): Promise<string> {
  const title = parameters.title.trim();
  const note = parameters.note?.trim();
  if (!parameters.groupId || !title) throw validationError();
  const args = toCreateRollCallRpcArgs({ ...parameters, title, note });
  const { data, error } = await getSupabaseClient().rpc("create_roll_call", args);
  if (error) throwAttendanceSupabaseError(error, "createRollCall");
  return data;
}

export async function markQrAttendance(
  parameters: MarkQrAttendanceParameters
): Promise<AttendanceMutationResult> {
  if (!parameters.rollCallId || !parameters.presentedToken || !parameters.clientOperationId) {
    throw validationError();
  }
  const { data, error } = await getSupabaseClient().rpc(
    "mark_attendance_present",
    toQrAttendanceRpcArgs(parameters)
  );
  if (error) throwAttendanceSupabaseError(error, "markQrAttendance");
  const row = data[0];
  if (!row) throw databaseResponseError();
  return mapAttendanceMutationResult(row);
}

export async function markManualAttendance(
  parameters: MarkManualAttendanceParameters
): Promise<AttendanceMutationResult> {
  if (!parameters.rollCallId || !parameters.membershipId || !parameters.clientOperationId) {
    throw validationError();
  }
  const { data, error } = await getSupabaseClient().rpc(
    "mark_attendance_manual",
    toManualAttendanceRpcArgs(parameters)
  );
  if (error) throwAttendanceSupabaseError(error, "markManualAttendance");
  const row = data[0];
  if (!row) throw databaseResponseError();
  return mapAttendanceMutationResult(row);
}

export async function closeRollCall(rollCallId: string): Promise<CloseRollCallResult> {
  if (!rollCallId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("close_roll_call", {
    target_roll_call_id: rollCallId,
  });
  if (error) throwAttendanceSupabaseError(error, "closeRollCall");
  const row = data[0];
  if (!row) throw databaseResponseError();
  return mapCloseRollCall(row);
}

function validationError(): AppError {
  return new AppError({
    code: appErrorCodes.validation,
    message: userSafeErrorMessages[appErrorCodes.validation],
  });
}

function databaseResponseError(): AppError {
  return new AppError({
    code: appErrorCodes.database,
    message: userSafeErrorMessages[appErrorCodes.database],
    retryable: true,
  });
}
