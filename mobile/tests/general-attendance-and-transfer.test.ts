import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const start = read("../src/features/attendance/screens/create-general-attendance-screen.tsx");
const dashboard = read(
  "../src/features/attendance/screens/general-attendance-dashboard-screen.tsx"
);
const generalApi = read("../src/features/attendance/api/general-attendance.ts");

test("General start is super-organiser-only and blocks archived events", () => {
  assert.match(start, /role !== "super_organiser"/);
  assert.match(start, /status !== "active"/);
  assert.match(start, /Archived trips cannot start attendance/);
});

test("General creation sends temporary operator permissions through the secured RPC", () => {
  assert.match(generalApi, /rpc\("create_general_attendance_session"/);
  assert.match(generalApi, /can_scan/);
  assert.match(generalApi, /can_mark_manually/);
  assert.doesNotMatch(generalApi, /\.from\("event_members"\).*\.(insert|update|delete)/s);
});

test("General dashboard follows backend permissions and contains no offline controls", () => {
  assert.match(dashboard, /permissions\.canScan/);
  assert.match(dashboard, /permissions\.canMarkManually/);
  assert.doesNotMatch(dashboard, /OfflineRoster|offline roster|pending sync/i);
});

test("General scanner uses the canonical attendance-unit resolver and remains online-only", () => {
  const route = read("../src/app/events/[eventId]/attendance/general/[sessionId]/scanner.tsx");
  const scanner = read("../src/features/attendance/screens/scanner-screen.tsx");
  assert.match(route, /ScannerScreen/);
  assert.match(scanner, /useResolveAttendanceQr/);
  assert.match(scanner, /attendanceUnitId/);
  assert.match(scanner, /General scanning is online only/);
  assert.match(scanner, /if \(!user \|\| !rollCallId \|\| general\) return/);
});
