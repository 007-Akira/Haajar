import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAttendanceDashboardState,
  getDashboardActionVisibility,
  getRollCallCreatorName,
  getVisibleDashboardMembers,
} from "../src/features/attendance/config/roll-call-dashboard-view";
import type { RollCallDashboard } from "../src/features/attendance/types/attendance-contracts";

const dashboard: RollCallDashboard = {
  rollCall: {
    id: "roll-call-1",
    sessionId: "session-1",
    attendanceUnitId: "roll-call-1",
    scopeType: "subgroup",
    eventId: "event-1",
    groupId: "group-1",
    title: "Before departure",
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
      role: "member",
      status: "unmarked",
      markedAt: null,
      markingMethod: null,
    },
  ],
  permissions: { canScan: true, canMarkManually: true, canClose: true },
};

test("real dashboard counts and creator are used", () => {
  assert.deepEqual(dashboard.counts, {
    totalRoster: 3,
    present: 1,
    remaining: 2,
    percentage: 33.3,
  });
  assert.equal(getRollCallCreatorName(dashboard), "Adithya");
});

test("search and filters operate on the real roster", () => {
  assert.deepEqual(
    getVisibleDashboardMembers(dashboard, "present", "").map((member) => member.displayName),
    ["Adithya"]
  );
  assert.deepEqual(
    getVisibleDashboardMembers(dashboard, "remaining", "mat").map((member) => member.displayName),
    ["Mathews"]
  );
  assert.equal(getVisibleDashboardMembers(dashboard, "all", "9800000002").length, 1);
});

test("role-aware actions follow backend permissions", () => {
  assert.deepEqual(getDashboardActionVisibility(dashboard), {
    canScan: true,
    canMarkManually: true,
    canClose: true,
  });
  assert.deepEqual(
    getDashboardActionVisibility({
      ...dashboard,
      permissions: { canScan: true, canMarkManually: false, canClose: false },
    }),
    { canScan: true, canMarkManually: false, canClose: false }
  );
});

test("closed, empty, archived, and unauthorised states are explicit", () => {
  assert.equal(
    getAttendanceDashboardState({
      ...dashboard,
      rollCall: { ...dashboard.rollCall, status: "closed" },
    }),
    "closed"
  );
  assert.equal(
    getAttendanceDashboardState({
      ...dashboard,
      counts: { totalRoster: 0, present: 0, remaining: 0, percentage: 0 },
    }),
    "empty"
  );
  assert.equal(getAttendanceDashboardState(dashboard, "archived", "active"), "archived");
  assert.equal(
    getAttendanceDashboardState({
      ...dashboard,
      permissions: { canScan: false, canMarkManually: false, canClose: false },
    }),
    "unauthorised"
  );
  assert.deepEqual(
    getDashboardActionVisibility({
      ...dashboard,
      rollCall: { ...dashboard.rollCall, status: "closed" },
    }),
    { canScan: false, canMarkManually: false, canClose: false }
  );
});

test("screen confirms closure and uses secured hooks without direct writes", () => {
  const screen = readFileSync(
    new URL("../src/features/attendance/screens/active-roll-call-screen.tsx", import.meta.url),
    "utf8"
  );
  const closeHook = readFileSync(
    new URL("../src/features/attendance/hooks/use-close-roll-call.ts", import.meta.url),
    "utf8"
  );
  const mutationApi = readFileSync(
    new URL("../src/features/attendance/api/attendance-mutations.ts", import.meta.url),
    "utf8"
  );

  assert.equal(screen.includes("useRollCallDashboard"), true);
  assert.equal(screen.includes("useCloseRollCall"), true);
  assert.equal(screen.includes('dialog.alert(\n          "Close roll call?"'), true);
  assert.equal(closeHook.includes("getCloseRollCallCacheTargets"), true);
  assert.equal(mutationApi.includes('rpc("close_roll_call"'), true);
  assert.equal(/getSupabaseClient|\.from\(|\.insert\(|\.update\(/.test(screen), false);
});
