import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database.types";

export interface ForegroundAttendanceAlert {
  sessionId: string;
  groupId: string | null;
  scopeName: string;
  route: string;
}

interface AttendanceSessionChange {
  id?: unknown;
  status?: unknown;
}

function object(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export async function getForegroundAttendanceAlert(
  sessionId: string
): Promise<ForegroundAttendanceAlert> {
  const { data, error } = await getSupabaseClient().rpc("get_attendance_alert_context", {
    target_session_id: sessionId,
  });
  if (error) throwSupabaseError(error, "getForegroundAttendanceAlert");
  const row = object(data);
  return {
    sessionId: String(row.session_id ?? sessionId),
    groupId: typeof row.group_id === "string" ? row.group_id : null,
    scopeName: String(row.scope_name ?? "your group"),
    route: String(row.route ?? ""),
  };
}

export function subscribeToAttendanceStarts(input: {
  userId: string;
  onStart: (sessionId: string) => void;
}): { unsubscribe: () => Promise<void> } {
  const client = getSupabaseClient();
  const channel: RealtimeChannel = client.channel(`foreground-attendance-starts:${input.userId}`);
  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "attendance_sessions" },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const row = payload.new as AttendanceSessionChange;
      if (row.status === "active" && typeof row.id === "string") input.onStart(row.id);
    }
  );
  channel.subscribe();
  return {
    unsubscribe: async () => {
      await client.removeChannel(channel);
    },
  };
}
