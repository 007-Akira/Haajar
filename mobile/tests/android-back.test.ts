import assert from "node:assert/strict";
import test from "node:test";

import { resolveBackFallback } from "../src/lib/navigation/android-back";

test("restores logical attendance parents when stack history is unavailable", () => {
  assert.equal(
    resolveBackFallback("/events/event-1/groups/group-1/roll-calls/roll-call-1/scanner"),
    "/events/event-1/groups/group-1/roll-calls/roll-call-1"
  );
  assert.equal(
    resolveBackFallback("/events/event-1/attendance/general/session-1/manual"),
    "/events/event-1/attendance/general/session-1"
  );
});

test("restores group, event, and tab parents", () => {
  assert.equal(
    resolveBackFallback("/events/event-1/groups/group-1/members/member-1"),
    "/events/event-1/groups/group-1"
  );
  assert.equal(resolveBackFallback("/events/event-1/groups/group-1"), "/events/event-1");
  assert.equal(resolveBackFallback("/events/event-1"), "/");
  assert.equal(resolveBackFallback("/groups"), "/");
});

test("does not invent fallbacks for authentication or the root route", () => {
  assert.equal(resolveBackFallback("/"), null);
  assert.equal(resolveBackFallback("/sign-in"), null);
  assert.equal(resolveBackFallback("/auth/callback"), null);
});
