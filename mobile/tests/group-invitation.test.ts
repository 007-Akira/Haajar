import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildInvitationShareMessage,
  canCreateGroupInvitation,
  createEphemeralInvitationStore,
  requestGroupInvitation,
  safeInvitationErrorMessage,
} from "../src/features/registration/types/group-invitation-models";

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

const token = "a1b2c3d4e5f60718293a4b5c";

test("only active organisers can see invitation generation", () => {
  assert.equal(canCreateGroupInvitation("organiser", "active", "active"), true);
  assert.equal(canCreateGroupInvitation("super_organiser", "active", "active"), true);
  assert.equal(canCreateGroupInvitation("co_organiser", "active", "active"), false);
  assert.equal(canCreateGroupInvitation("member", "active", "active"), false);
  assert.equal(canCreateGroupInvitation("organiser", "active", "archived"), false);
});

test("invitation request invokes the secured generator once", async () => {
  const calls: string[] = [];
  const invitation = await requestGroupInvitation("group-1", async (groupId) => {
    calls.push(groupId);
    return { invitationId: "invitation-1", invitationToken: token };
  });
  assert.deepEqual(calls, ["group-1"]);
  assert.equal(invitation.deepLink, `haajar://join/${token}`);
});

test("ephemeral token state is cleared when its owner unmounts", () => {
  const store = createEphemeralInvitationStore();
  store.set({
    invitationId: "invitation-1",
    invitationToken: token,
    deepLink: `haajar://join/${token}`,
  });
  assert.equal(store.get()?.invitationToken, token);
  store.clear();
  assert.equal(store.get(), null);
});

test("share payload contains the token-based deep link without a group UUID", () => {
  const link = `haajar://join/${token}`;
  const message = buildInvitationShareMessage("Bus 2", link);
  assert.equal(message.includes(link), true);
  assert.equal(message.includes("550e8400-e29b-41d4-a716-446655440000"), false);
});

test("unexpected errors cannot leak invitation tokens or UUIDs", () => {
  const unsafe = new Error(`${token} 550e8400-e29b-41d4-a716-446655440000`);
  const message = safeInvitationErrorMessage(unsafe);
  assert.equal(message.includes(token), false);
  assert.equal(message.includes("550e8400"), false);
});

test("invitation hook contains no persistent-storage writes", () => {
  const source = readFileSync(
    new URL(
      "../src/features/registration/hooks/use-ephemeral-group-invitation.ts",
      import.meta.url
    ),
    "utf8"
  );
  assert.equal(/AsyncStorage|SecureStore|setItemAsync|setItem\s*\(/.test(source), false);
});
