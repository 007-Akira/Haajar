import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createScannerGate,
  getResolutionResultCopy,
} from "../src/features/attendance/config/scanner-state";
import {
  mapMembershipQrResolution,
  redactQrToken,
  redactedQrToken,
} from "../src/features/qr/types/qr-models";

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
  const result = mapMembershipQrResolution({
    resolution_status: "valid",
    membership_id: "membership-1",
    member_user_id: "user-1",
    display_name: "Mathews",
    phone: "9800000000",
    group_id: "group-1",
    group_name: "Bus 2",
    member_role: "member",
    membership_status: "active",
    credential_status: "active",
    credential_version: 2,
  });
  assert.equal(result.status, "valid");
  assert.equal(result.status === "valid" && result.displayName, "Mathews");
  assert.equal("token" in result, false);
  assert.equal("tokenHash" in result, false);
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

test("resolver receives only opaque scan payload and expected group", () => {
  const screen = scannerSource();
  const resolverHook = readFileSync(
    new URL("../src/features/qr/hooks/use-resolve-membership-qr.ts", import.meta.url),
    "utf8"
  );
  const resolverApi = readFileSync(
    new URL("../src/features/qr/api/qr-queries.ts", import.meta.url),
    "utf8"
  );
  assert.match(screen, /expectedGroupId: groupId/);
  assert.match(screen, /presentedToken: scan\.data/);
  assert.match(resolverApi, /presented_token: presentedToken/);
  assert.match(resolverApi, /expected_group_id: expectedGroupId/);
  const safeVariables = resolverHook.match(/interface SafeResolutionVariables \{([^}]*)\}/s)?.[1];
  assert.equal(safeVariables?.includes("presentedToken"), false);
});

test("confirmation uses secured mark hook and handles already-marked result", () => {
  const screen = scannerSource();
  assert.match(screen, /useMarkQrAttendance/);
  assert.match(screen, /attendanceMutation\.markQrAttendance/);
  assert.match(screen, /marked\.outcome === "already_marked"/);
  assert.match(screen, /MemberVerificationSheet/);
  assert.match(screen, /confirmPresent/);
});

test("raw QR is ephemeral, cleared on background and unmount, and never logged", () => {
  const screen = scannerSource();
  const resolverHook = readFileSync(
    new URL("../src/features/qr/hooks/use-resolve-membership-qr.ts", import.meta.url),
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
