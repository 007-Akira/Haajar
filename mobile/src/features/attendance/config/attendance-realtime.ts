export type AttendanceRealtimeState = "idle" | "connecting" | "live" | "degraded";

export function buildAttendanceRealtimeFilter(rollCallId: string): string {
  return `roll_call_id=eq.${rollCallId}`;
}

export function buildAttendanceRealtimeChannelName(rollCallId: string, userId: string): string {
  return `attendance:${rollCallId}:${userId}`;
}

export function isAttendanceChangeForRollCall(
  changedRollCallId: unknown,
  expectedRollCallId: string
): boolean {
  return changedRollCallId === expectedRollCallId;
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
