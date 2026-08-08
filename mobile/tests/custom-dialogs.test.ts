import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "../src/features/attendance/screens/active-roll-call-screen.tsx",
  "../src/features/attendance/screens/general-attendance-dashboard-screen.tsx",
  "../src/features/groups/screens/group-details-screen.tsx",
  "../src/features/events/screens/trip-details-screen.tsx",
  "../src/features/registration/screens/registration-form-builder-screen.tsx",
  "../src/app/events/[eventId]/edit.tsx",
  "../src/app/events/[eventId]/groups/[groupId]/edit.tsx",
];

test("all feature dialogs use the shared themed dialog instead of native alerts", () => {
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bAlert\.alert\(/, file);
    assert.doesNotMatch(source, /import \{[^}]*\bAlert\b[^}]*\} from "react-native"/, file);
    assert.match(source, /useAppDialog/, file);
  }
});

test("the app-level dialog is themed and handles destructive and cancel actions", () => {
  const source = readFileSync(
    new URL("../src/components/feedback/app-dialog.tsx", import.meta.url),
    "utf8"
  );
  const layout = readFileSync(new URL("../src/app/_layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<AppDialogProvider>/);
  assert.match(source, /colors\.scrim/);
  assert.match(source, /colors\.danger/);
  assert.match(source, /action\.style === "destructive"/);
  assert.match(source, /action\.style === "cancel"/);
  assert.match(source, /onRequestClose/);
});
