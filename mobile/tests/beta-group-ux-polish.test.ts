import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AppError, appErrorCodes } from "../src/lib/errors/app-error";
import {
  groupNameMutationError,
  validateGroupName,
} from "../src/features/groups/config/group-name-validation";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const groupDetails = source("../src/features/groups/screens/group-details-screen.tsx");
const tripDetails = source("../src/features/events/screens/trip-details-screen.tsx");
const createGroup = source("../src/features/groups/screens/create-group-screen.tsx");
const editGroup = source("../src/app/events/[eventId]/groups/[groupId]/edit.tsx");
const attendance = source("../src/features/groups/components/group-primary-actions.tsx");
const uniqueNamesMigration = source(
  "../../supabase/migrations/20260812000200_unique_active_group_names.sql"
);

test("valid transport group names remain valid and empty names explain the problem", () => {
  for (const name of ["Bus", "Bus 2", "Train 1"]) assert.equal(validateGroupName(name), undefined);
  assert.equal(validateGroupName("  "), "Enter a group name.");
});

test("duplicate category and operational names receive contextual messages", () => {
  const conflict = new AppError({ code: appErrorCodes.conflict, message: "Conflict" });
  assert.equal(
    groupNameMutationError(conflict, "category"),
    "A category with this name already exists in this trip."
  );
  assert.match(uniqueNamesMigration, /groups_unique_active_category_name_per_event/);
  assert.match(uniqueNamesMigration, /groups_unique_active_operational_name_per_category/);
  assert.match(uniqueNamesMigration, /lower\(btrim\(name\)\)/);
  assert.equal(
    groupNameMutationError(conflict, "operational"),
    "A group with this name already exists in this category."
  );
});

test("create and edit clear stale backend name errors when the value changes", () => {
  assert.match(createGroup, /setBackendNameError\(undefined\)/);
  assert.match(createGroup, /onBlur=\{\(\) => setNameTouched\(true\)\}/);
  assert.match(editGroup, /setBackendNameError\(undefined\)/);
  assert.match(editGroup, /mutation\.reset\(\)/);
});

test("deletion identifies exact entity type and requires its exact current name", () => {
  assert.match(groupDetails, /TYPE \"\$\{group\.name\}\" TO CONFIRM/);
  assert.match(groupDetails, /DELETE CATEGORY PERMANENTLY/);
  assert.match(groupDetails, /DELETE OPERATIONAL GROUP PERMANENTLY/);
  assert.match(groupDetails, /deleteConfirmation !== group\.name/);
  assert.match(tripDetails, /TYPE \"\$\{event\.name\}\" TO CONFIRM/);
  assert.match(tripDetails, /DELETE TRIP PERMANENTLY/);
  assert.match(tripDetails, /deleteConfirmation !== event\.name/);
});

test("Danger Zone and typed confirmation require explicit settings and delete actions", () => {
  assert.match(groupDetails, /groupSettingsOpen \?/);
  assert.match(groupDetails, /!deleteConfirmationOpen \?/);
  assert.match(groupDetails, /reveal-delete-group-confirmation/);
  assert.match(tripDetails, /tripSettingsOpen \?/);
  assert.match(tripDetails, /!deleteConfirmationOpen \?/);
  assert.match(tripDetails, /reveal-delete-trip-confirmation/);
});

test("attendance presents coherent inactive and active category or subgroup states", () => {
  assert.match(attendance, /No active attendance/);
  assert.match(attendance, /START CATEGORY ATTENDANCE/);
  assert.match(attendance, /Attendance active/);
  assert.match(attendance, /OPEN CATEGORY ATTENDANCE/);
  assert.match(attendance, />REMAINING</);
  assert.match(attendance, /OPEN SUBGROUP ATTENDANCE/);
  assert.doesNotMatch(attendance, /No active roll call/);
});

test("start is hidden for archived and unauthorised group detail states and guarded from duplicates", () => {
  const createRollCallHook = source("../src/features/attendance/hooks/use-create-roll-call.ts");
  assert.match(groupDetails, /!isArchived \? \(/);
  assert.match(groupDetails, /group-details-unauthorised/);
  assert.match(createRollCallHook, /guard\.tryStart\(\)/);
});
