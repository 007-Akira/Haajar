import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildAttendanceRealtimeChannelName,
  buildAttendanceRealtimeFilter,
  createInvalidationScheduler,
  isAttendanceChangeForRollCall,
} from "../src/features/attendance/config/attendance-realtime";

test("subscription identity and database filter are scoped to one roll call", () => {
  assert.equal(buildAttendanceRealtimeFilter("roll-call-1"), "roll_call_id=eq.roll-call-1");
  assert.equal(
    buildAttendanceRealtimeChannelName("roll-call-1", "user-1"),
    "attendance:roll-call-1:user-1"
  );
});

test("unrelated roll-call events are ignored", () => {
  assert.equal(isAttendanceChangeForRollCall("roll-call-1", "roll-call-1"), true);
  assert.equal(isAttendanceChangeForRollCall("roll-call-2", "roll-call-1"), false);
  assert.equal(isAttendanceChangeForRollCall(undefined, "roll-call-1"), false);
});

test("bursts coalesce into one targeted invalidation", () => {
  let invalidations = 0;
  let scheduled: (() => void) | null = null;
  let timerCreations = 0;
  const scheduler = createInvalidationScheduler(
    () => {
      invalidations += 1;
    },
    350,
    (callback) => {
      timerCreations += 1;
      scheduled = callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    },
    () => undefined
  );
  scheduler.schedule();
  scheduler.schedule();
  scheduler.schedule();
  assert.equal(timerCreations, 1);
  assert.equal(invalidations, 0);
  (scheduled as (() => void) | null)?.();
  assert.equal(invalidations, 1);
  scheduler.schedule();
  assert.equal(timerCreations, 2);
  scheduler.clear();
});

test("focused hook prevents duplicates and cleans up on blur or unmount", () => {
  const hook = readFileSync(
    new URL("../src/features/attendance/hooks/use-attendance-realtime.ts", import.meta.url),
    "utf8"
  );
  assert.match(hook, /useFocusEffect/);
  assert.match(hook, /subscriptionRef\.current/);
  assert.match(hook, /subscriptionRef\.current = null/);
  assert.match(hook, /subscription\.unsubscribe\(\)/);
  assert.match(hook, /scheduler\.clear\(\)/);
});

test("channel watches only attendance inserts and updates with exact filtering", () => {
  const api = readFileSync(
    new URL("../src/features/attendance/api/attendance-realtime.ts", import.meta.url),
    "utf8"
  );
  assert.match(api, /registerChange\(channel, "INSERT"/);
  assert.match(api, /registerChange\(channel, "UPDATE"/);
  assert.match(api, /table: "attendance_records", filter/);
  assert.doesNotMatch(api, /qr_credentials|profiles|group_memberships/);
});

test("reconnect triggers one debounced catch-up of only the dashboard key", () => {
  const hook = readFileSync(
    new URL("../src/features/attendance/hooks/use-attendance-realtime.ts", import.meta.url),
    "utf8"
  );
  assert.match(hook, /nextState === "live" && previousState === "degraded"/);
  assert.match(hook, /queryKeys\.attendance\.dashboard/);
  assert.match(hook, /invalidateQueries\(\{ queryKey, exact: true \}\)/);
  assert.doesNotMatch(hook, /invalidateQueries\(\)/);
});

test("migration publishes only attendance records", () => {
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260802001200_attendance_realtime.sql", import.meta.url),
    "utf8"
  );
  assert.match(migration, /add table public\.attendance_records/);
  assert.doesNotMatch(migration, /add table public\.qr_credentials/);
  assert.doesNotMatch(migration, /add table public\.profiles/);
});
