import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

import type { ActiveRollCall, RollCallDashboard } from "../types/attendance-contracts";
import { throwAttendanceSupabaseError } from "./attendance-error-mapper";
import { mapActiveRollCall, mapRollCallDashboard } from "./attendance-mappers";

export async function getActiveRollCall(groupId: string): Promise<ActiveRollCall | null> {
  if (!groupId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("get_active_roll_call", {
    target_group_id: groupId,
  });
  if (error) throwAttendanceSupabaseError(error, "getActiveRollCall");
  const row = data[0];
  return row ? mapActiveRollCall(row) : null;
}

export async function getRollCallDashboard(rollCallId: string): Promise<RollCallDashboard> {
  if (!rollCallId) throw validationError();
  const { data, error } = await getSupabaseClient().rpc("get_roll_call_dashboard", {
    target_roll_call_id: rollCallId,
  });
  if (error) throwAttendanceSupabaseError(error, "getRollCallDashboard");
  return mapRollCallDashboard(data);
}

function validationError(): AppError {
  return new AppError({
    code: appErrorCodes.validation,
    message: userSafeErrorMessages[appErrorCodes.validation],
  });
}
