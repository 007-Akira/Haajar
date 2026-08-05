import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createScannerGate,
  getResolutionResultCopy,
} from "../src/features/attendance/config/scanner-state";
import { redactQrToken, redactedQrToken } from "../src/features/qr/types/qr-models";

test("scanner gate pauses, resumes, and debounces repeated frames", () => {
  let now = 1000;
  const gate = createScannerGate(1500, () => now);
  assert.equal(gate.tryAcquire(), true);
  assert.equal(gate.tryAcquire(), false);
  gate.resume();
  assert.equal(gate.tryAcquire(), false);
  now += 1500;
  assert.equal(gate.tryAcquire(), true);
  gate.pause();
  now += 1500;
  assert.equal(gate.tryAcquire(), false);
  gate.resume();
  assert.equal(gate.tryAcquire(), true);
});

test("wrong-group and revoked results remain non-destructive", () => {
  assert.deepEqual(getResolutionResultCopy("wrong_group"), {
    tone: "error",
    title: "Wrong group",
    message: "This ticket belongs to another group and cannot be used here.",
  });
  assert.equal(getResolutionResultCopy("revoked").title, "Ticket revoked");
});

test("valid resolution contains verification fields but no credential secret", () => {
  const api = readFileSync(
    new URL("../src/features/attendance/api/attendance-qr.ts", import.meta.url),
    "utf8"
  );
  const mappedResult = api.match(/return \{\s*status,(.*?)\n\s*\};/s)?.[1] ?? "";
  assert.match(mappedResult, /displayName/);
  assert.match(mappedResult, /rosterEntryId/);
  assert.doesNotMatch(mappedResult, /presentedToken|tokenHash|credential/i);
});

test("scanner requests permission and supports Android settings and unavailable state", () => {
  const screen = scannerSource();
  const appConfig = readFileSync(new URL("../app.json", import.meta.url), "utf8");
  assert.match(screen, /useCameraPermissions/);
  assert.match(screen, /requestPermission/);
  assert.match(screen, /Linking\.openSettings/);
  assert.match(screen, /onMountError/);
  assert.match(appConfig, /expo-camera/);
});

test("scanner close control stays tappable and exits even without navigation history", () => {
  const screen = scannerSource();
  const overlay = readFileSync(
    new URL("../src/components/scanner/scanner-overlay.tsx", import.meta.url),
    "utf8"
  );
  assert.match(screen, /function closeScanner\(\)/);
  assert.match(screen, /router\.canGoBack\(\)/);
  assert.match(screen, /router\.replace\(/);
  assert.match(screen, /onPress=\{closeScanner\}/);
  assert.match(screen, /zIndex: 10/);
  assert.match(screen, /elevation: 10/);
  assert.match(overlay, /pointerEvents="box-none"/);
});

test("resolver receives only opaque scan payload and expected attendance unit", () => {
  const screen = scannerSource();
  const resolverHook = readFileSync(
    new URL("../src/features/attendance/hooks/use-attendance-qr.ts", import.meta.url),
    "utf8"
  );
  const resolverApi = readFileSync(
    new URL("../src/features/attendance/api/attendance-qr.ts", import.meta.url),
    "utf8"
  );
  assert.match(screen, /attendanceUnitId/);
  assert.match(screen, /presentedToken: scan\.data/);
  assert.match(resolverApi, /presented_token: input\.presentedToken/);
  assert.match(resolverApi, /attendance_unit_id: input\.attendanceUnitId/);
  assert.match(resolverHook, /mutationFn: async \(attendanceUnitId: string\)/);
  assert.match(resolverHook, /secret\.take\(\)/);
});

test("confirmation uses secured mark hook and handles already-marked result", () => {
  const screen = scannerSource();
  assert.match(screen, /useMarkAttendanceRosterPresent/);
  assert.match(screen, /rosterAttendanceMutation\.mark/);
  assert.match(screen, /marked\.outcome === "already_marked"/);
  assert.match(screen, /MemberVerificationSheet/);
  assert.match(screen, /confirmPresent/);
});

test("raw QR is ephemeral, cleared on background and unmount, and never logged", () => {
  const screen = scannerSource();
  const resolverHook = readFileSync(
    new URL("../src/features/attendance/hooks/use-attendance-qr.ts", import.meta.url),
    "utf8"
  );
  assert.match(screen, /createEphemeralSecretStore/);
  assert.match(screen, /AppState\.addEventListener/);
  assert.match(screen, /tokenStore\.clear\(\)/);
  assert.match(screen, /gate\.clear\(\)/);
  assert.doesNotMatch(
    `${screen}\n${resolverHook}`,
    /AsyncStorage|SecureStore|setItemAsync|console\.(log|warn|error)|analytics/i
  );
  const token = "a".repeat(64);
  const redacted = redactQrToken({ details: `Rejected HJR:2:${token}` });
  assert.equal(JSON.stringify(redacted).includes(token), false);
  assert.equal(JSON.stringify(redacted).includes(redactedQrToken), true);
});

test("scanner screen has no direct database or table access", () => {
  assert.doesNotMatch(scannerSource(), /getSupabaseClient|\.from\(|\.insert\(|\.update\(|\.rpc\(/);
});

function scannerSource(): string {
  return readFileSync(
    new URL("../src/features/attendance/screens/scanner-screen.tsx", import.meta.url),
    "utf8"
  );
}
