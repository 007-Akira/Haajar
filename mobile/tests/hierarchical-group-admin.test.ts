import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260812000100_hierarchical_group_admin_and_assignment.sql",
    import.meta.url
  ),
  "utf8"
);
const details = readFileSync(
  new URL("../src/features/groups/screens/group-details-screen.tsx", import.meta.url),
  "utf8"
);
const members = readFileSync(
  new URL("../src/features/groups/screens/group-members-screen.tsx", import.meta.url),
  "utf8"
);
const add = readFileSync(
  new URL("../src/features/groups/screens/add-trip-members-screen.tsx", import.meta.url),
  "utf8"
);
const mutations = readFileSync(
  new URL("../src/features/groups/api/group-mutations.ts", import.meta.url),
  "utf8"
);
const queries = readFileSync(
  new URL("../src/features/groups/api/group-queries.ts", import.meta.url),
  "utf8"
);

test("event administration is explicit and never fakes subgroup participation", () => {
  assert.match(migration, /return 'event_admin'/);
  assert.match(migration, /return 'member'/);
  assert.match(details, /hasParticipationMembership/);
  assert.match(details, /EVENT ADMIN ACCESS/);
  assert.match(details, /groupKind === "operational" && hasParticipationMembership/);
});
test("zero-member subgroup offers distinct assignment and invitation actions only to managers", () => {
  assert.match(details, /No members yet/);
  assert.match(details, /Add Trip Members/);
  assert.match(details, /Invite New Members/);
  assert.match(members, /canManage && groupQuery\.data\?\.groupKind === "operational"/);
});
test("assignment is an RPC with no client membership writes and canonical sibling handling", () => {
  assert.match(mutations, /rpc\(\s*"assign_event_member_to_operational_group"/);
  assert.doesNotMatch(mutations, /from\("group_memberships"\)[\s\S]*\.(insert|update|delete)/);
  assert.match(add, /Already assigned to \$\{siblingName\}\. Transfer the member instead/);
  assert.match(migration, /values\(target\.id,target_user_id,'member','active'/);
  assert.doesNotMatch(migration, /new_role/);
});
test("category totals use one backend distinct-participant aggregation", () => {
  assert.match(queries, /list_event_groups_with_participation_counts/);
  assert.match(migration, /count\(distinct gm\.user_id\)/);
  assert.match(migration, /child\.status='active'/);
  assert.match(migration, /gm\.status='active'/);
});
