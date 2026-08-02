import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  attendanceCsvHeaders,
  buildAttendanceCsv,
  canExportAttendance,
  createAttendanceExportFilename,
} from "../src/features/attendance/export/attendance-csv";
import type { RollCallDashboard } from "../src/features/attendance/types/attendance-contracts";

const dashboard: RollCallDashboard = {
  rollCall: {
    id: "roll-call",
    eventId: "event",
    groupId: "group",
    title: "Final check",
    note: null,
    status: "closed",
    startedAt: "2026-08-02T09:30:00.000Z",
    closedAt: "2026-08-02T10:00:00.000Z",
    createdBy: "organiser",
  },
  counts: { totalRoster: 2, present: 1, remaining: 1 },
  presentMembers: [
    {
      membershipId: "one",
      userId: "one",
      displayName: "ആദിത്യ",
      phone: "98XXXXXXXX",
      role: "co_organiser",
      status: "present",
      markedAt: "2026-08-02T09:45:00.000Z",
      markingMethod: "offline_sync",
    },
  ],
  remainingMembers: [
    {
      membershipId: "two",
      userId: "two",
      displayName: "=Unsafe Name",
      phone: null,
      role: "member",
      status: "absent",
      markedAt: null,
      markingMethod: null,
    },
  ],
  permissions: {
    canScan: false,
    canMarkManually: false,
    canClose: false,
    canViewFullHistory: true,
  },
};

test("CSV has the exact approved headers and no sensitive fields", () => {
  assert.deepEqual(attendanceCsvHeaders, [
    "Trip Name",
    "Group Name",
    "Roll Call Date",
    "Member Name",
    "Phone",
    "Group Role",
    "Attendance Status",
    "Marked Time",
    "Marking Method",
  ]);
  const csv = buildAttendanceCsv({ dashboard, tripName: "IV 2026", groupName: "Bus 2" });
  assert.doesNotMatch(csv, /qr token|token hash|registration answer|email/i);
});

test("CSV contains present and absent rows and preserves Unicode", () => {
  const csv = buildAttendanceCsv({ dashboard, tripName: "യാത്ര", groupName: "ബസ് 2" });
  assert.match(csv, /ആദിത്യ/);
  assert.match(csv, /യാത്ര/);
  assert.match(csv, /"Present"/);
  assert.match(csv, /"Absent"/);
  assert.match(csv, /"Offline scan"/);
  assert.match(csv, /"'=Unsafe Name"/);
  assert.equal(csv.startsWith("\uFEFF"), true);
});

test("only active organisers with secured full history can export a closed roll call", () => {
  const base = {
    rollCallStatus: "closed",
    membershipStatus: "active",
    canViewFullHistory: true,
  };
  assert.equal(canExportAttendance({ ...base, role: "organiser" }), true);
  assert.equal(canExportAttendance({ ...base, role: "super_organiser" }), true);
  assert.equal(canExportAttendance({ ...base, role: "co_organiser" }), false);
  assert.equal(canExportAttendance({ ...base, role: "member" }), false);
  assert.equal(
    canExportAttendance({ ...base, role: "organiser", rollCallStatus: "active" }),
    false
  );
  assert.equal(
    canExportAttendance({ ...base, role: "organiser", canViewFullHistory: false }),
    false
  );
});

test("active roll calls fail closed and filenames are filesystem safe", () => {
  assert.throws(() =>
    buildAttendanceCsv({
      dashboard: {
        ...dashboard,
        rollCall: { ...dashboard.rollCall, status: "active", closedAt: null },
      },
      tripName: "Trip",
      groupName: "Group",
    })
  );
  assert.equal(
    createAttendanceExportFilename("../../ Bus: 2 🔒", dashboard.rollCall.startedAt),
    "haajar-bus-2-2026-08-02.csv"
  );
});

test("screen handles share and storage failures without exposing technical data", () => {
  const screen = readFileSync(
    new URL("../src/features/attendance/screens/active-roll-call-screen.tsx", import.meta.url),
    "utf8"
  );
  assert.match(screen, /could not be shared/);
  assert.match(screen, /could not be saved/);
  assert.match(screen, /catch \{/);
  assert.doesNotMatch(screen, /qrToken|tokenHash|registrationAnswers/);
});
