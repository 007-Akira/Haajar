import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

export async function fetchOfflineRollCallBundle(rollCallId: string): Promise<unknown> {
  const { data, error } = await getSupabaseClient().rpc("get_offline_roll_call_bundle", {
    target_roll_call_id: rollCallId,
  });
  if (error) throwSupabaseError(error, "getOfflineRollCallBundle");
  return data;
}

export async function syncOfflineAttendanceOperation(input: {
  operationId: string;
  rollCallId: string;
  membershipId: string;
  localMarkedAt: string;
}) {
  const { data, error } = await getSupabaseClient().rpc("sync_offline_attendance", {
    client_operation_id: input.operationId,
    local_marked_at: input.localMarkedAt,
    target_membership_id: input.membershipId,
    target_roll_call_id: input.rollCallId,
  });
  if (error) throwSupabaseError(error, "syncOfflineAttendance");
  return data[0];
}
