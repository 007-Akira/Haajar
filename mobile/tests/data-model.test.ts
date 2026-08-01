import assert from "node:assert/strict";
import test from "node:test";

import {
  canManageEvent,
  toEventDisplayRole,
  toGroupDisplayRole,
} from "../src/features/events/permissions/event-permissions";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

test("maps database roles to UI roles without granting extra permissions", () => {
  assert.equal(toEventDisplayRole("member"), "member");
  assert.equal(toEventDisplayRole("super_organiser"), "super organiser");
  assert.equal(canManageEvent("member"), false);
  assert.equal(canManageEvent("super_organiser"), true);
  assert.equal(toGroupDisplayRole("member"), "member");
  assert.equal(toGroupDisplayRole("co_organiser"), "co-organiser");
  assert.equal(toGroupDisplayRole("organiser"), "organiser");
  assert.equal(toGroupDisplayRole("super_organiser"), "super organiser");
});

test("normalises database and network failures to safe application errors", async () => {
  const { appErrorCodes, mapSupabaseError, userSafeErrorMessages } =
    await import("../src/lib/errors/index");
  const permissionError = mapSupabaseError(
    { code: "42501", message: "private database details" },
    "test.permission"
  );
  const networkError = mapSupabaseError(
    { message: "Failed to fetch from internal endpoint" },
    "test.network"
  );

  assert.equal(permissionError.code, appErrorCodes.permissionDenied);
  assert.equal(permissionError.message, userSafeErrorMessages.PERMISSION_DENIED);
  assert.equal(permissionError.message.includes("private database details"), false);
  assert.equal(networkError.code, appErrorCodes.network);
  assert.equal(networkError.retryable, true);
  assert.equal(networkError.message, userSafeErrorMessages.NETWORK_ERROR);
});
