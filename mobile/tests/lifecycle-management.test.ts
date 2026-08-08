import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("trip and group lifecycle writes use guarded RPCs", () => {
  const eventApi = source("../src/features/events/api/event-mutations.ts");
  const groupApi = source("../src/features/groups/api/group-mutations.ts");
  for (const rpc of ["update_event", "archive_event", "delete_event"])
    assert.match(eventApi, new RegExp(`rpc\\(\\"${rpc}\\"`));
  for (const rpc of ["update_group", "archive_group", "delete_group"])
    assert.match(groupApi, new RegExp(`rpc\\(\\"${rpc}\\"`));
  assert.doesNotMatch(eventApi, /from\(["']events["']\)/);
  assert.doesNotMatch(groupApi, /from\(["']groups["']\)/);
});

test("destructive controls require typed names and explain category impact", () => {
  const trip = source("../src/features/events/screens/trip-details-screen.tsx");
  const group = source("../src/features/groups/screens/group-details-screen.tsx");
  assert.match(trip, /deleteConfirmation !== event\.name/);
  assert.match(group, /deleteConfirmation !== group\.name/);
  assert.match(group, /childGroups\.filter/);
  assert.match(group, /active subgroup/);
});

test("offline attendance blocks lifecycle mutations until sync", () => {
  const eventHooks = source("../src/features/events/hooks/use-event-lifecycle.ts");
  const groupHooks = source("../src/features/groups/hooks/use-group-lifecycle.ts");
  const cache = source("../src/features/attendance/offline/services/offline-roster-cache.ts");
  assert.match(eventHooks, /getPendingLifecycleAttendanceCount/);
  assert.match(groupHooks, /getPendingLifecycleAttendanceCount/);
  assert.match(cache, /sync_state IN \('pending','syncing','failed'\)/);
});

test("personal group archive stays separate from global group status", () => {
  const groupsTab = source("../src/app/(tabs)/groups.tsx");
  const groupApi = source("../src/features/groups/api/group-mutations.ts");
  assert.match(groupsTab, /Archive for Me/);
  assert.match(groupsTab, /Restore Group/);
  assert.match(groupApi, /set_my_group_archived/);
});
