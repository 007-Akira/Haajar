import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase";

import {
  buildAttendanceRealtimeChannelName,
  buildAttendanceRealtimeFilter,
  isAttendanceChangeForRollCall,
  type AttendanceRealtimeState,
} from "../config/attendance-realtime";

interface AttendanceChangeRow {
  session_id?: unknown;
}

export interface AttendanceRealtimeSubscription {
  unsubscribe(): Promise<void>;
}

export interface SubscribeToAttendanceChangesParameters {
  sessionId: string;
  userId: string;
  onChange: () => void;
  onStateChange: (state: AttendanceRealtimeState) => void;
}

export function subscribeToAttendanceChanges({
  sessionId,
  userId,
  onChange,
  onStateChange,
}: SubscribeToAttendanceChangesParameters): AttendanceRealtimeSubscription {
  const supabase = getSupabaseClient();
  const filter = buildAttendanceRealtimeFilter(sessionId);
  const channel = supabase.channel(buildAttendanceRealtimeChannelName(sessionId, userId));
  const handleChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>): void => {
    const changed = payload.new as AttendanceChangeRow;
    if (isAttendanceChangeForRollCall(changed.session_id, sessionId)) onChange();
  };

  registerChange(channel, "INSERT", filter, handleChange);
  registerChange(channel, "UPDATE", filter, handleChange);
  onStateChange("connecting");
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onStateChange("live");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      onStateChange("degraded");
    }
  });

  return {
    async unsubscribe(): Promise<void> {
      await supabase.removeChannel(channel);
    },
  };
}

function registerChange(
  channel: RealtimeChannel,
  event: "INSERT" | "UPDATE",
  filter: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
): void {
  channel.on(
    "postgres_changes",
    { event, schema: "public", table: "attendance_records", filter },
    callback
  );
}
