import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  mapRollCallDashboard,
  mapRollCallHistoryItem,
} from "../src/features/attendance/api/attendance-mappers";
import { getGroupActionSections } from "../src/features/groups/config/group-action-config";

test("history RPC rows map stable counts and closed metadata", () => {
  const item = mapRollCallHistoryItem({
    roll_call_id: "roll-call-1",
    event_id: "event-1",
    group_id: "group-1",
    title: "Before departure",
    status: "closed",
    started_at: "2026-08-02T09:00:00Z",
    closed_at: "2026-08-02T09:10:00Z",
    created_by: "user-1",
    created_by_name: "Adithya",
    total_roster: 4,
    present_count: 3,
    remaining_count: 1,
  });
  assert.equal(item.status, "closed");
  assert.equal(item.totalRoster, 4);
  assert.equal(item.presentCount, 3);
  assert.equal(item.remainingCount, 1);
});

test("closed summary maps snapshot absences and authorised marker attribution", () => {
  const dashboard = mapRollCallDashboard({
    roll_call: {
      id: "roll-call-1",
      event_id: "event-1",
      group_id: "group-1",
      title: "Before departure",
      note: null,
      status: "closed",
      started_at: "2026-08-02T09:00:00Z",
      closed_at: "2026-08-02T09:10:00Z",
      created_by: "user-1",
      created_by_name: "Adithya",
      closed_by_name: "Adithya",
    },
    counts: { total_roster: 2, present: 1, remaining: 1 },
    present_members: [
      {
        membership_id: "membership-1",
        user_id: "user-1",
        display_name: "Mathews",
        phone: "9800000000",
        role: "member",
        status: "present",
        marked_at: "2026-08-02T09:05:00Z",
        marking_method: "manual",
        marked_by: "organiser-1",
        marked_by_name: "Adithya",
      },
    ],
    remaining_members: [
      {
        membership_id: "membership-2",
        user_id: "user-2",
        display_name: "Niya",
        phone: "9800000001",
        role: "member",
        status: "absent",
      },
    ],
    permissions: {
      can_scan: true,
      can_mark_manually: true,
      can_close: true,
      can_view_full_history: true,
    },
  });
  assert.deepEqual(dashboard.counts, {
    totalRoster: 2,
    present: 1,
    remaining: 1,
    percentage: 50,
  });
  assert.equal(dashboard.remainingMembers[0]?.status, "absent");
  assert.equal(dashboard.presentMembers[0]?.markingMethod, "manual");
  assert.equal(dashboard.presentMembers[0]?.markedByName, "Adithya");
});

test("history uses the stored roster snapshot rather than current memberships", () => {
  const schema = readFileSync(
    new URL(
      "../../supabase/migrations/20260802000900_roll_call_attendance_schema.sql",
      import.meta.url
    ),
    "utf8"
  );
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260802001100_roll_call_history.sql", import.meta.url),
    "utf8"
  );
  assert.match(schema, /create table public\.attendance_unit_roster/);
  assert.match(schema, /on delete restrict/);
  assert.match(migration, /public\.attendance_unit_roster/);
  assert.match(migration, /order by s\.started_at desc/);
  assert.doesNotMatch(migration, /from public\.group_memberships as roster/);
});

test("members, co-organisers, and organisers receive the configured history entry", () => {
  for (const role of ["member", "co-organiser", "organiser", "super organiser"] as const) {
    const sections = getGroupActionSections(role, false);
    assert.equal(
      [sections.primary, ...sections.priority, ...sections.more].some(
        (action) => action.id === "attendance-history"
      ),
      true
    );
  }
});

test("history UI is read-only and uses secured query modules", () => {
  const historyScreen = readFileSync(
    new URL("../src/features/attendance/screens/roll-call-history-screen.tsx", import.meta.url),
    "utf8"
  );
  const detailScreen = readFileSync(
    new URL("../src/features/attendance/screens/active-roll-call-screen.tsx", import.meta.url),
    "utf8"
  );
  const api = readFileSync(
    new URL("../src/features/attendance/api/attendance-queries.ts", import.meta.url),
    "utf8"
  );
  assert.match(historyScreen, /useRollCallHistory/);
  assert.match(api, /rpc\("get_roll_call_history"/);
  assert.match(detailScreen, /closed-roll-call-summary/);
  assert.match(detailScreen, /!closed/);
  assert.doesNotMatch(historyScreen, /getSupabaseClient|\.from\(|\.insert\(|\.update\(/);
});

test("Main Group exposes General attendance history through the secured event RPC", () => {
  const mainGroup = readFileSync(
    new URL("../src/features/events/components/main-group-card.tsx", import.meta.url),
    "utf8"
  );
  const trip = readFileSync(
    new URL("../src/features/events/screens/trip-details-screen.tsx", import.meta.url),
    "utf8"
  );
  const screen = readFileSync(
    new URL(
      "../src/features/attendance/screens/general-attendance-history-screen.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const api = readFileSync(
    new URL("../src/features/attendance/api/attendance-queries.ts", import.meta.url),
    "utf8"
  );
  const migration = readFileSync(
    new URL(
      "../../supabase/migrations/20260808000400_general_attendance_history.sql",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(mainGroup, /Attendance History/);
  assert.match(trip, /attendance\/general\/history/);
  assert.match(screen, /useGeneralAttendanceHistory/);
  assert.match(screen, /attendance\/general\/\$\{item\.id\}/);
  assert.match(api, /rpc\("get_general_attendance_history"/);
  assert.match(migration, /public\.is_active_event_member/);
  assert.match(migration, /session\.scope_type = 'general'/);
  assert.match(migration, /public\.attendance_unit_roster/);
  assert.doesNotMatch(screen, /getSupabaseClient|\.from\(|\.insert\(|\.update\(/);
});
