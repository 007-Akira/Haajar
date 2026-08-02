export type AttendanceRealtimeState = "idle" | "connecting" | "live" | "degraded";

export function buildAttendanceRealtimeFilter(sessionId: string): string {
  return `session_id=eq.${sessionId}`;
}

export function buildAttendanceRealtimeChannelName(rollCallId: string, userId: string): string {
  return `attendance:${rollCallId}:${userId}`;
}

export function isAttendanceChangeForRollCall(
  changedSessionId: unknown,
  expectedSessionId: string
): boolean {
  return changedSessionId === expectedSessionId;
}

export interface InvalidationScheduler {
  schedule(): void;
  flush(): void;
  clear(): void;
}

export function createInvalidationScheduler(
  invalidate: () => void,
  delayMilliseconds = 350,
  scheduleTimer: (
    callback: () => void,
    delay: number
  ) => ReturnType<typeof setTimeout> = setTimeout,
  cancelTimer: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout
): InvalidationScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    if (timer) cancelTimer(timer);
    timer = null;
    invalidate();
  }

  return {
    schedule(): void {
      if (timer) return;
      timer = scheduleTimer(flush, delayMilliseconds);
    },
    flush,
    clear(): void {
      if (timer) cancelTimer(timer);
      timer = null;
    },
  };
}
