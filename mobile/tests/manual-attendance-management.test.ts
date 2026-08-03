import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mapAttendanceMutationResult } from "../src/features/attendance/api/attendance-mappers";
import {
  canManageManualAttendance,
  getManualAttendanceMembers,
  getManualAttendanceTarget,
} from "../src/features/attendance/config/manual-attendance-view";
import { createMutationGuard } from "../src/features/attendance/config/mutation-guard";
import type { RollCallDashboard } from "../src/features/attendance/types/attendance-contracts";

const dashboard: RollCallDashboard = {
  rollCall: {
    id: "roll-call-1",
    sessionId: "session-1",
    attendanceUnitId: "roll-call-1",
    scopeType: "subgroup",
    eventId: "event-1",
    groupId: "group-1",
    title: "Boarding",
    note: null,
    status: "active",
    startedAt: "2026-08-02T09:00:00Z",
    closedAt: null,
    createdBy: "user-1",
  },
  counts: { totalRoster: 3, present: 1, remaining: 2, percentage: 33.3 },
  units: [],
  presentMembers: [
    {
      membershipId: "membership-1",
      userId: "user-1",
      displayName: "Adithya",
      phone: "9800000001",
      role: "organiser",
      status: "present",
      markedAt: "2026-08-02T09:05:00Z",
      markingMethod: "manual",
    },
  ],
  remainingMembers: [
    {
      membershipId: "membership-2",
      userId: "user-2",
      displayName: "Mathews",
      phone: "9800000002",
      role: "member",
      status: "unmarked",
      markedAt: null,
      markingMethod: null,
    },
    {
      membershipId: "membership-3",
      userId: "user-3",
      displayName: "Niya",
      phone: null,
      role: "co_organiser",
      status: "unmarked",
      markedAt: null,
      markingMethod: null,
    },
  ],
  permissions: { canScan: true, canMarkManually: true, canClose: true },
};

test("manual attendance visibility follows backend permission and active status", () => {
  assert.equal(canManageManualAttendance(dashboard), true);
  assert.equal(
    canManageManualAttendance({
      ...dashboard,
      permissions: { canScan: true, canMarkManually: false, canClose: false },
    }),
    false
  );
  assert.equal(
    canManageManualAttendance({
      ...dashboard,
      rollCall: { ...dashboard.rollCall, status: "closed" },
    }),
    false
  );
});

test("manual marking uses the attendance unit and exact roster entry", () => {
  const targetDashboard: RollCallDashboard = {
    ...dashboard,
    rollCall: {
      ...dashboard.rollCall,
      id: "session-or-unit",
      attendanceUnitId: "attendance-unit",
    },
    remainingMembers: [
      { ...dashboard.remainingMembers[0]!, rosterEntryId: "roster-entry" },
      ...dashboard.remainingMembers.slice(1),
    ],
  };

  assert.deepEqual(
    getManualAttendanceTarget(targetDashboard, targetDashboard.remainingMembers[0]!),
    {
      rollCallId: "attendance-unit",
      membershipId: "roster-entry",
    }
  );
});

test("remaining members lead the roster while present rows stay visible", () => {
  assert.deepEqual(
    getManualAttendanceMembers(dashboard, "", "all").map((member) => [
      member.displayName,
      member.status,
    ]),
    [
      ["Mathews", "unmarked"],
      ["Niya", "unmarked"],
      ["Adithya", "present"],
    ]
  );
  assert.deepEqual(
    getManualAttendanceMembers(dashboard, "9800000002", "members").map(
      (member) => member.displayName
    ),
    ["Mathews"]
  );
  assert.deepEqual(
    getManualAttendanceMembers(dashboard, "", "organisers").map((member) => member.displayName),
    ["Niya", "Adithya"]
  );
});

test("successful and duplicate manual marks are canonical non-duplicating outcomes", () => {
  const base = {
    attendance_record_id: "attendance-1",
    marked_at: "2026-08-02T09:06:00Z",
    marking_method: "manual",
    member_user_id: "user-2",
    membership_id: "membership-2",
    result_status: "marked_present",
  } as const;
  assert.equal(mapAttendanceMutationResult(base).outcome, "marked");
  assert.equal(
    mapAttendanceMutationResult({ ...base, result_status: "already_marked" }).outcome,
    "already_marked"
  );
  const guard = createMutationGuard();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
});

test("screen uses one secured mutation per row, phone flow, and no direct writes", () => {
  const screen = readFileSync(
    new URL("../src/features/attendance/screens/manual-attendance-screen.tsx", import.meta.url),
    "utf8"
  );
  const hook = readFileSync(
    new URL("../src/features/attendance/hooks/use-mark-manual-attendance.ts", import.meta.url),
    "utf8"
  );
  assert.match(screen, /function ManualRosterRow/);
  assert.match(screen, /useMarkManualAttendance\(\)/);
  assert.match(screen, /openPhoneLink\(member\.phone\)/);
  assert.match(screen, /member\.status === "unmarked"/);
  assert.match(screen, /manual-attendance-closed/);
  assert.match(hook, /getAttendanceMarkCacheTargets/);
  assert.doesNotMatch(screen, /getSupabaseClient|\.from\(|\.insert\(|\.update\(|\.rpc\(/);
});

test("dashboard action opens the real manual attendance route", () => {
  const dashboardScreen = readFileSync(
    new URL("../src/features/attendance/screens/active-roll-call-screen.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    dashboardScreen,
    /\/events\/\[eventId\]\/groups\/\[groupId\]\/roll-calls\/\[rollCallId\]\/manual/
  );
});
