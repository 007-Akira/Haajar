import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mapMembershipQrResolution } from "../src/features/qr/types/qr-models";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

test("maps valid QR resolution to the minimum confirmation model", () => {
  const result = mapMembershipQrResolution({
    resolution_status: "valid",
    membership_id: "membership-1",
    member_user_id: "user-1",
    display_name: "Mathews",
    phone: "98XXXXXXXX",
    group_id: "group-1",
    group_name: "Bus 2",
    member_role: "member",
    membership_status: "active",
    credential_status: "active",
    credential_version: 3,
  });

  assert.deepEqual(result, {
    status: "valid",
    membershipId: "membership-1",
    memberUserId: "user-1",
    displayName: "Mathews",
    phone: "98XXXXXXXX",
    groupId: "group-1",
    groupName: "Bus 2",
    role: "member",
    membershipStatus: "active",
    credentialStatus: "active",
    credentialVersion: 3,
  });
  assert.equal("token" in result, false);
  assert.equal("email" in result, false);
});

test("non-valid QR resolutions discard every member field", () => {
  for (const status of [
    "invalid",
    "revoked",
    "wrong_group",
    "inactive_membership",
    "archived",
    "unauthorised",
  ]) {
    const result = mapMembershipQrResolution({
      resolution_status: status,
      membership_id: "must-not-escape",
      member_user_id: "must-not-escape",
      display_name: "must-not-escape",
      phone: "must-not-escape",
      group_id: "must-not-escape",
      group_name: "must-not-escape",
      member_role: "member",
      membership_status: "active",
      credential_status: "active",
      credential_version: 1,
    });
    assert.deepEqual(result, { status });
  }
});

test("data wrapper invokes only the secured resolution RPC", () => {
  const source = readFileSync(
    new URL("../src/features/qr/api/qr-queries.ts", import.meta.url),
    "utf8"
  );
  assert.match(source, /rpc\("resolve_membership_qr"/);
  assert.doesNotMatch(source, /\.from\("qr_credentials"/);
  assert.doesNotMatch(source, /token_hash|token_ciphertext/);
});

test("unknown resolver statuses become canonical safe database errors", () => {
  assert.throws(
    () =>
      mapMembershipQrResolution({
        resolution_status: "internal-token-a1b2c3",
        membership_id: "unused",
        member_user_id: "unused",
        display_name: "unused",
        phone: "unused",
        group_id: "unused",
        group_name: "unused",
        member_role: "unused",
        membership_status: "unused",
        credential_status: "unused",
        credential_version: 0,
      }),
    (error: unknown) =>
      error instanceof Error &&
      !error.message.includes("internal-token-a1b2c3") &&
      error.message === "Haajar could not load that information right now."
  );
});
