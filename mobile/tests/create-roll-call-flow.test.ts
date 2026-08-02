import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AppError, appErrorCodes } from "../src/lib/errors/app-error";
import {
  buildRollCallDashboardRoute,
  getCreateRollCallAccess,
  mapCreateRollCallFailure,
  normalizeRollCallTitle,
} from "../src/features/attendance/config/create-roll-call-flow";
import { createMutationGuard } from "../src/features/attendance/config/mutation-guard";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

const allowedContext = {
  membershipRole: "super_organiser",
  membershipStatus: "active",
  groupStatus: "active",
  eventStatus: "active",
  activeMemberCount: 4,
};

test("active organisers and super organisers may start a roll call", () => {
  assert.equal(getCreateRollCallAccess(allowedContext).allowed, true);
  assert.equal(getCreateRollCallAccess(allowedContext).allowed, true);
  assert.equal(
    getCreateRollCallAccess({ ...allowedContext, membershipRole: "organiser" }).allowed,
    false
  );
});

test("members, co-organisers, and inactive organisers cannot start", () => {
  assert.deepEqual(getCreateRollCallAccess({ ...allowedContext, membershipRole: "member" }), {
    allowed: false,
    reason: "unauthorised",
  });
  assert.equal(
    getCreateRollCallAccess({ ...allowedContext, membershipRole: "co_organiser" }).allowed,
    false
  );
  assert.equal(
    getCreateRollCallAccess({ ...allowedContext, membershipStatus: "inactive" }).allowed,
    false
  );
});

test("archived groups and empty active rosters are blocked", () => {
  assert.deepEqual(getCreateRollCallAccess({ ...allowedContext, groupStatus: "archived" }), {
    allowed: false,
    reason: "archived",
  });
  assert.deepEqual(getCreateRollCallAccess({ ...allowedContext, activeMemberCount: 0 }), {
    allowed: false,
    reason: "no_active_members",
  });
});

test("optional label gets a safe backend-supported default", () => {
  assert.equal(normalizeRollCallTitle("  Before departure "), "Before departure");
  assert.equal(normalizeRollCallTitle("   "), "Roll call");
});

test("existing and newly created roll calls use the real dashboard route", () => {
  assert.deepEqual(buildRollCallDashboardRoute("event-1", "group-1", "roll-call-1"), {
    pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]",
    params: { eventId: "event-1", groupId: "group-1", rollCallId: "roll-call-1" },
  });
});

test("duplicate taps are synchronously prevented", () => {
  const guard = createMutationGuard();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
  guard.finish();
  assert.equal(guard.tryStart(), true);
});

test("create errors map active, archived, permission, network, and backend failures", () => {
  assert.equal(
    mapCreateRollCallFailure(
      new AppError({ code: appErrorCodes.conflict, message: "safe", cause: { code: "23505" } })
    ),
    "active_roll_call_exists"
  );
  assert.equal(
    mapCreateRollCallFailure(
      new AppError({ code: appErrorCodes.conflict, message: "safe", cause: { code: "55000" } })
    ),
    "archived"
  );
  assert.equal(
    mapCreateRollCallFailure(
      new AppError({ code: appErrorCodes.permissionDenied, message: "safe" })
    ),
    "unauthorised"
  );
  assert.equal(
    mapCreateRollCallFailure(new AppError({ code: appErrorCodes.network, message: "safe" })),
    "network_error"
  );
  assert.equal(mapCreateRollCallFailure(new Error("unknown")), "backend_failure");
});

test("production screen uses the secured RPC layer without direct table access", () => {
  const screen = readFileSync(
    new URL("../src/features/attendance/screens/create-roll-call-screen.tsx", import.meta.url),
    "utf8"
  );
  const api = readFileSync(
    new URL("../src/features/attendance/api/attendance-mutations.ts", import.meta.url),
    "utf8"
  );
  assert.equal(screen.includes("useCreateRollCall"), true);
  assert.equal(screen.includes("useActiveRollCall"), true);
  assert.equal(screen.includes("setTimeout"), false);
  assert.equal(screen.includes("morning-assembly"), false);
  assert.equal(/getSupabaseClient|\.from\(|\.rpc\(/.test(screen), false);
  assert.equal(api.includes('"create_roll_call"'), true);
  assert.equal(/\.from\(["']roll_calls["']\).*\.insert/.test(api), false);
});
