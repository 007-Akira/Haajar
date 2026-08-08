import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { classifyHaajarQrPayload } from "../src/features/qr/types/haajar-qr-payload";

const token = "a1b2c3d4e5f6g7h8i9j0k1l2";
const membership = `HJR:3:${"a".repeat(64)}`;
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("strictly classifies canonical invitation and membership QR payloads", () => {
  assert.deepEqual(classifyHaajarQrPayload(`haajar://join/${token}`), {
    type: "invitation",
    token,
  });
  assert.deepEqual(classifyHaajarQrPayload(membership), { type: "membership" });
  assert.deepEqual(classifyHaajarQrPayload("a".repeat(64)), { type: "membership" });
});

test("rejects malformed invitations, external URLs, and arbitrary QR values", () => {
  for (const payload of [
    "haajar://join",
    "haajar://join/short",
    `haajar://join/${token}/extra`,
    `https://evil.example/join/${token}`,
    `javascript:haajar://join/${token}`,
    "ordinary product QR",
  ]) {
    assert.deepEqual(classifyHaajarQrPayload(payload), { type: "unknown" });
  }
});

test("Join Group exposes the dedicated invitation camera route", () => {
  const entry = source("../src/features/registration/screens/join-group-entry-screen.tsx");
  const route = source("../src/app/join/scan.tsx");
  assert.match(entry, /SCAN INVITATION QR/);
  assert.match(entry, /router\.push\("\/join\/scan"/);
  assert.match(route, /InvitationScannerScreen/);
});

test("invitation scanner covers permission, recovery, debounce, and cleanup", () => {
  const scanner = source("../src/features/registration/screens/invitation-scanner-screen.tsx");
  assert.match(scanner, /useCameraPermissions/);
  assert.match(scanner, /requestPermission/);
  assert.match(scanner, /Linking\.openSettings/);
  assert.match(scanner, /cameraUnavailable/);
  assert.match(scanner, /gate\.tryAcquire\(\)/);
  assert.match(scanner, /processing \|\| !appActive/);
  assert.match(scanner, /resolveGroupInvitation\(payload\.token\)/);
  assert.match(scanner, /tokenStore\.take\(\)/);
  assert.match(scanner, /tokenStore\.clear\(\)/);
  assert.match(scanner, /AppState\.addEventListener/);
  assert.match(scanner, /useFocusEffect/);
  assert.doesNotMatch(scanner, /AsyncStorage|SQLite|console\.|queryClient|useQuery/);
});

test("QR purpose errors are separated before unrelated resolvers", () => {
  const invitationScanner = source(
    "../src/features/registration/screens/invitation-scanner-screen.tsx"
  );
  const attendanceScanner = source("../src/features/attendance/screens/scanner-screen.tsx");
  assert.match(invitationScanner, /This is a membership QR, not a group invitation\./);
  assert.match(attendanceScanner, /This is a group invitation, not a membership QR\./);
  assert.ok(
    attendanceScanner.indexOf("classifyHaajarQrPayload(scan.data)") <
      attendanceScanner.indexOf("resolver.resolve")
  );
});

test("scanner routes validated tokens into the existing invitation route", () => {
  const scanner = source("../src/features/registration/screens/invitation-scanner-screen.tsx");
  assert.match(scanner, /router\.replace\(`\/join\/\$\{token\}`/);
  assert.match(scanner, /This invitation is no longer active\./);
  assert.match(scanner, /Couldn’t verify this invitation/);
});
