import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

export interface GeneralOperatorInput {
  userId: string;
  canScan: boolean;
  canMarkManually: boolean;
}

export interface GeneralOperator extends GeneralOperatorInput {
  name: string;
}

export async function getActiveGeneralAttendance(eventId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from("attendance_sessions")
    .select("id")
    .eq("event_id", eventId)
    .eq("scope_type", "general")
    .eq("status", "active")
    .maybeSingle();
  if (error) throwSupabaseError(error, "getActiveGeneralAttendance");
  return data?.id ?? null;
}

export async function createGeneralAttendance(input: {
  eventId: string;
  title: string;
  operators: GeneralOperatorInput[];
}): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc("create_general_attendance_session", {
    target_event_id: input.eventId,
    session_title: input.title,
    selected_operators: input.operators.map((operator) => ({
      user_id: operator.userId,
      can_scan: operator.canScan,
      can_mark_manually: operator.canMarkManually,
    })),
  });
  if (error) throwSupabaseError(error, "createGeneralAttendance");
  return data;
}

export async function listGeneralOperators(sessionId: string): Promise<GeneralOperator[]> {
  const { data: units, error: unitError } = await getSupabaseClient()
    .from("attendance_units")
    .select("id")
    .eq("session_id", sessionId)
    .eq("unit_type", "event")
    .single();
  if (unitError) throwSupabaseError(unitError, "listGeneralOperators.unit");
  const { data, error } = await getSupabaseClient()
    .from("attendance_unit_operators")
    .select(
      "user_id, can_scan, can_mark_manually, profiles!attendance_unit_operators_user_id_fkey(full_name)"
    )
    .eq("attendance_unit_id", units.id);
  if (error) throwSupabaseError(error, "listGeneralOperators");
  return data.map((row) => ({
    userId: row.user_id,
    canScan: row.can_scan,
    canMarkManually: row.can_mark_manually,
    name: row.profiles?.full_name?.trim() || "Volunteer",
  }));
}

export async function setGeneralOperator(input: {
  sessionId: string;
  operator: GeneralOperatorInput;
}): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc("set_general_attendance_operator", {
    target_session_id: input.sessionId,
    target_user_id: input.operator.userId,
    allow_scan: input.operator.canScan,
    allow_manual: input.operator.canMarkManually,
  });
  if (error) throwSupabaseError(error, "setGeneralOperator");
  return data;
}
