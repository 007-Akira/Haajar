import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(
  new URL(
    "../../supabase/migrations/20260802000900_roll_call_attendance_schema.sql",
    import.meta.url
  ),
  "utf8"
);
const functions = readFileSync(
  new URL(
    "../../supabase/migrations/20260802001000_roll_call_attendance_functions.sql",
    import.meta.url
  ),
  "utf8"
);
const dashboard = readFileSync(
  new URL("../../supabase/migrations/20260802001100_roll_call_history.sql", import.meta.url),
  "utf8"
);
const offline = readFileSync(
  new URL("../../supabase/migrations/20260802001400_offline_attendance_sync.sql", import.meta.url),
  "utf8"
);

test("groups support category and operational hierarchy without changing applied migrations", () => {
  assert.match(schema, /group_kind text not null default 'operational'/);
  assert.match(schema, /parent_group_id uuid references public\.groups/);
  assert.match(schema, /Group hierarchy cycle detected/);
  assert.match(schema, /create_category_group/);
  assert.match(schema, /create_operational_group/);
});

test("active operational membership is exclusive per category with an atomic transfer path", () => {
  assert.match(schema, /category_group_id uuid references public\.groups/);
  assert.match(schema, /group_memberships_one_active_operational_per_category/);
  assert.match(schema, /where status = 'active' and category_group_id is not null/);
  assert.match(schema, /CATEGORY_MEMBERSHIP_CONFLICT/);
  assert.match(schema, /transfer_operational_group_membership/);
  assert.match(schema, /pg_advisory_xact_lock/);
  assert.match(schema, /set status='inactive'/);
  assert.match(schema, /public\.issue_membership_qr\(target_membership_id\)/);
  assert.match(schema, /group_membership\.transferred/);
});

test("attendance uses sessions, units, temporary operators, and immutable roster snapshots", () => {
  for (const table of [
    "attendance_sessions",
    "attendance_units",
    "attendance_unit_operators",
    "attendance_unit_roster",
    "attendance_records",
  ]) {
    assert.match(schema, new RegExp(`create table public\\.${table}`));
  }
  assert.match(schema, /unique\(session_id, user_id\)/);
  assert.match(schema, /display_name_snapshot/);
  assert.match(schema, /source_group_name_snapshot/);
});

test("General creates one event unit and only selected temporary volunteers operate", () => {
  assert.match(functions, /create_general_attendance_session/);
  assert.match(functions, /values\(new_session_id,target_event\.id,'event'\)/);
  assert.match(functions, /selected_operators/);
  assert.match(functions, /attendance_unit_operators/);
  assert.doesNotMatch(
    functions.match(
      /create_general_attendance_session[\s\S]*?exception when unique_violation/
    )?.[0] ?? "",
    /parent_group_id/
  );
});

test("category creation rejects duplicate sibling membership and creates child subgroup units", () => {
  assert.match(functions, /group by gm\.user_id having count\(\*\)>1/);
  assert.match(functions, /g\.parent_group_id=category\.id/);
  assert.match(functions, /values\(new_session_id,category\.event_id,child\.id,'subgroup'\)/);
  assert.match(functions, /gm\.role in \('co_organiser','organiser','super_organiser'\)/);
});

test("category dashboard aggregates snapshots and retains source subgroup", () => {
  assert.match(dashboard, /'can_view_aggregate',can_aggregate/);
  assert.match(dashboard, /'units'/);
  assert.match(dashboard, /source_group_name_snapshot/);
  assert.match(dashboard, /session_row\.status='closed' then 'absent' else 'unmarked'/);
  assert.doesNotMatch(dashboard, /join public\.group_memberships/);
});

test("subgroup operators cannot gain sibling aggregate access", () => {
  assert.match(dashboard, /Category aggregate permission required/);
  assert.match(dashboard, /attendance_unit_id=requested_unit_id/);
  assert.match(functions, /membership\.group_id<>unit\.group_id/);
});

test("offline attendance is explicitly limited to operational subgroup units", () => {
  assert.match(offline, /unit\.unit_type<>'subgroup'/);
  assert.match(offline, /Offline attendance is available only for operational subgroups/);
  assert.doesNotMatch(
    offline,
    /attendance_sessions[\s\S]*scope_type='general'[\s\S]*credential_hash/
  );
});

test("mobile aggregate UI exposes subgroup progress, filtering, calls, and source subgroup export", () => {
  const screen = readFileSync(
    new URL("../src/features/attendance/screens/active-roll-call-screen.tsx", import.meta.url),
    "utf8"
  );
  const csv = readFileSync(
    new URL("../src/features/attendance/export/attendance-csv.ts", import.meta.url),
    "utf8"
  );
  assert.match(screen, /category-unit-progress/);
  assert.match(screen, /category-subgroup-filter/);
  assert.match(screen, /sourceGroupName/);
  assert.match(screen, /openPhoneLink/);
  assert.match(csv, /Source Subgroup/);
});
