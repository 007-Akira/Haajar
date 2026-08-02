import assert from "node:assert/strict";
import test from "node:test";

import {
  createSingleUseAction,
  DEFAULT_POST_AUTH_ROUTE,
  resolvePostAuthRoute,
  safeAuthReturnTo,
  safeOAuthCallbackError,
  sanitizeInternalReturnTo,
} from "../src/features/auth/services/auth-return";

test("preserves valid invitation and ordinary internal return routes", () => {
  const token = "a1b2c3d4e5f60718293a4b5c";
  assert.equal(sanitizeInternalReturnTo(`/join/${token}`), `/join/${token}`);
  assert.equal(sanitizeInternalReturnTo("/groups"), "/groups");
  assert.equal(
    sanitizeInternalReturnTo("/events/10000000-0000-4000-8000-000000000001"),
    "/events/10000000-0000-4000-8000-000000000001"
  );
  assert.equal(safeAuthReturnTo(undefined), DEFAULT_POST_AUTH_ROUTE);
});

test("rejects external, malformed, and traversal return destinations", () => {
  const rejected = [
    "https://evil.example/path",
    "//evil.example/path",
    "javascript:alert(1)",
    "haajar://groups",
    "/events/../profile",
    "/events/%2e%2e/profile",
    "/events/%252e%252e/profile",
    "/events//profile",
    "/events/%",
    " /groups",
    "/groups\\admin",
    "/auth/callback",
    "/profile-setup",
    "/sign-in",
  ];
  for (const value of rejected) assert.equal(sanitizeInternalReturnTo(value), null, value);
});

test("post-auth routing preserves the destination through incomplete profile setup", () => {
  const returnTo = "/join/a1b2c3d4e5f60718293a4b5c";
  assert.deepEqual(resolvePostAuthRoute(false, returnTo), {
    kind: "profile-setup",
    returnTo,
  });
  assert.deepEqual(resolvePostAuthRoute(true, returnTo), {
    kind: "destination",
    href: returnTo,
  });
  assert.deepEqual(resolvePostAuthRoute(true, "https://evil.example"), {
    kind: "destination",
    href: DEFAULT_POST_AUTH_ROUTE,
  });
});

test("duplicate callback completion navigates only once", () => {
  const destinations: string[] = [];
  const navigate = createSingleUseAction<string>((destination) => destinations.push(destination));
  assert.equal(navigate("/groups"), true);
  assert.equal(navigate("/events/event-id"), false);
  assert.deepEqual(destinations, ["/groups"]);
});

test("return helpers and callback failures do not log or expose sensitive values", () => {
  const invitationToken = "sensitive-invitation-token";
  const oauthCode = "sensitive-oauth-code";
  const accessToken = "sensitive-access-token";
  const logged: unknown[][] = [];
  const originalLog = console.log;
  console.log = (...values: unknown[]) => logged.push(values);
  try {
    sanitizeInternalReturnTo(`/join/${invitationToken}`);
    resolvePostAuthRoute(false, `/join/${invitationToken}`);
    safeOAuthCallbackError();
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(logged, []);
  const safeError = safeOAuthCallbackError();
  assert.equal(safeError.includes(invitationToken), false);
  assert.equal(safeError.includes(oauthCode), false);
  assert.equal(safeError.includes(accessToken), false);
});
