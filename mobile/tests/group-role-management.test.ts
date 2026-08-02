import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getRoleChangeCacheTargets } from "../src/features/groups/config/role-change-cache";
import {
  mapRoleChangeError,
  toChangeGroupRoleRpcArgs,
} from "../src/features/groups/config/role-change-contract";
import {
  canSubmitRoleChange,
  getRoleManagementPolicy,
  type RoleManagementContext,
} from "../src/features/groups/config/role-management";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

const baseContext: RoleManagementContext = {
  actorRole: "organiser",
  actorStatus: "active",
  actorUserId: "actor-user",
  actorIsEventSuperOrganiser: false,
  groupStatus: "active",
  eventStatus: "active",
  targetRole: "member",
  targetStatus: "active",
  targetUserId: "target-user",
};

test("organiser sees Change Role while a normal member does not", () => {
  assert.equal(getRoleManagementPolicy(baseContext).visible, true);
  assert.equal(getRoleManagementPolicy({ ...baseContext, actorRole: "member" }).visible, false);
});

test("archived groups and inactive memberships block role changes", () => {
  const archived = getRoleManagementPolicy({ ...baseContext, groupStatus: "archived" });
  const inactive = getRoleManagementPolicy({ ...baseContext, targetStatus: "inactive" });
  assert.match(archived.blockedReason ?? "", /archived/i);
  assert.match(inactive.blockedReason ?? "", /active group membership/i);
  assert.deepEqual(archived.allowedRoles, []);
  assert.deepEqual(inactive.allowedRoles, []);
});

test("no-op and duplicate submissions are disabled", () => {
  const policy = getRoleManagementPolicy(baseContext);
  assert.equal(canSubmitRoleChange(policy, "member", "member", false), false);
  assert.equal(canSubmitRoleChange(policy, "member", "co_organiser", true), false);
  assert.equal(canSubmitRoleChange(policy, "member", "co_organiser", false), true);
});

test("role mutation builds the secured RPC payload", () => {
  assert.deepEqual(
    toChangeGroupRoleRpcArgs({ membershipId: "membership-1", role: "co_organiser" }),
    { target_membership_id: "membership-1", new_role: "co_organiser" }
  );
});

test("success targets only group, selected member, and affected QR caches", () => {
  const targets = getRoleChangeCacheTargets({
    groupId: "group-1",
    membershipId: "membership-1",
    actorUserId: "actor-user",
    affectedUserId: "target-user",
  });
  assert.deepEqual(targets.invalidate, [
    ["groups", "detail", "group-1", "actor-user"],
    ["groups", "group-1", "members", "actor-user"],
    ["groups", "group-1", "members", "membership-1", "actor-user"],
  ]);
  assert.deepEqual(targets.remove, [["membership-qr", "membership-1", "target-user"]]);
});

test("backend permission and last-organiser errors are user safe", () => {
  assert.match(
    mapRoleChangeError({ message: "Only an event super organiser may do this" }).message,
    /super organiser/i
  );
  assert.match(
    mapRoleChangeError({ message: "Cannot remove the last organiser" }).message,
    /keep at least one organiser/i
  );
});

test("role UI introduces no direct update or QR token display", () => {
  const mutationSource = readFileSync(
    new URL("../src/features/groups/api/group-mutations.ts", import.meta.url),
    "utf8"
  );
  const screenSource = readFileSync(
    new URL("../src/features/groups/screens/group-member-details-screen.tsx", import.meta.url),
    "utf8"
  );
  const hierarchyMigration = readFileSync(
    new URL(
      "../../supabase/migrations/20260802000900_roll_call_attendance_schema.sql",
      import.meta.url
    ),
    "utf8"
  );
  assert.equal(/from\(["']group_memberships["']\)[\s\S]*\.update\(/.test(mutationSource), false);
  assert.equal(/qr[_A-Z]?token|token_hash|encrypted/i.test(screenSource), false);
  assert.equal(/console\.(log|warn|error)/.test(screenSource), false);
  assert.match(
    hierarchyMigration,
    /select changed\.group_membership_id,changed\.qr_credential_id,null::text/
  );
});
