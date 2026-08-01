import assert from "node:assert/strict";
import test from "node:test";

import { getGroupActionSections } from "../src/features/groups/config/group-action-config";
import { formatAnswerValue, getInitials } from "../src/lib/presentation/member-formatters";

test("initials remain useful without profile photos", () => {
  assert.equal(getInitials("Mathews Jenkins"), "MJ");
  assert.equal(getInitials("  Adithya  "), "A");
  assert.equal(getInitials(""), "?");
});

test("registration answers have safe human-readable summaries", () => {
  assert.equal(formatAnswerValue(["Bus", "Train"]), "Bus, Train");
  assert.equal(formatAnswerValue(true), "Yes");
  assert.equal(formatAnswerValue(null), "Not answered");
});

test("invitation sharing remains hidden from member roles", () => {
  const memberActions = getGroupActionSections("member", false);
  const organiserActions = getGroupActionSections("organiser", false);
  assert.equal(
    memberActions.more.some((action) => action.id === "share-invitation"),
    false
  );
  assert.equal(
    organiserActions.more.some((action) => action.id === "share-invitation"),
    true
  );
});
