import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { sanitizeInternalReturnTo } from "../src/features/auth/services/auth-return";
import { redactTechnicalErrorContext } from "../src/lib/errors/development-logger";

const privacyHook = readFileSync(
  new URL("../src/features/privacy/hooks/use-sensitive-screen-privacy.ts", import.meta.url),
  "utf8"
);
const qrScreen = readFileSync(
  new URL("../src/features/groups/screens/my-group-qr-screen.tsx", import.meta.url),
  "utf8"
);
const qrHook = readFileSync(
  new URL("../src/features/qr/hooks/use-membership-qr.ts", import.meta.url),
  "utf8"
);
const invitationScreen = readFileSync(
  new URL("../src/features/registration/screens/group-invitation-screen.tsx", import.meta.url),
  "utf8"
);
const sessionProvider = readFileSync(
  new URL("../src/features/auth/providers/session-provider.tsx", import.meta.url),
  "utf8"
);
const appConfig = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8")) as {
  expo: { android: { allowBackup?: boolean; blockedPermissions?: string[] } };
};

test("capture protection follows screen focus and restores ordinary screenshot behaviour", () => {
  assert.match(privacyHook, /useFocusEffect/);
  assert.match(privacyHook, /preventScreenCaptureAsync\(protectionKey\)/);
  assert.match(privacyHook, /allowScreenCaptureAsync\(protectionKey\)/);
  assert.match(privacyHook, /enableAppSwitcherProtectionAsync\(1\)/);
  assert.match(privacyHook, /AppState\.addEventListener/);
});

test("only QR and generated invitation screens use sensitive-screen protection", () => {
  assert.match(qrScreen, /useSensitiveScreenPrivacy/);
  assert.match(invitationScreen, /useSensitiveScreenPrivacy/);
  assert.match(qrScreen, /haajar-membership-qr/);
  assert.match(invitationScreen, /haajar-group-invitation/);
});

test("backgrounding clears invitations, QR cache data, and transient render files", () => {
  assert.match(invitationScreen, /onBackground: invitationState\.clear/);
  assert.match(invitationScreen, /onBlur: invitationState\.clear/);
  assert.doesNotMatch(qrHook, /useQuery|queryClient|queryKeys/);
  assert.match(qrHook, /setData\(undefined\)/);
  assert.match(qrScreen, /onForeground: qrQuery\.refetch/);
  assert.match(qrScreen, /FileSystem\.deleteAsync/);
  assert.match(qrScreen, /captureRef/);
  assert.match(qrScreen, /shareAsync/);
  assert.match(qrScreen, /MediaLibrary\.createAssetAsync/);
});

test("release error contexts redact credentials, invitations, JWTs, and secrets", () => {
  const qr = `HJR:2:${"a".repeat(64)}`;
  const invitation = `/join/${"b".repeat(24)}`;
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature";
  const redacted = redactTechnicalErrorContext({
    operation: "test",
    message: `${qr} ${invitation} ${jwt}`,
    details: "c".repeat(64),
  });
  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes(qr), false);
  assert.equal(serialized.includes(invitation), false);
  assert.equal(serialized.includes(jwt), false);
  assert.equal(serialized.includes("c".repeat(64)), false);
});

test("sign-out clears all query and mutation cache entries", () => {
  assert.match(sessionProvider, /queryClient\.clear\(\)/);
});

test("deep links remain internal-only and Android backup is disabled", () => {
  assert.equal(sanitizeInternalReturnTo("/groups"), "/groups");
  for (const unsafe of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "/events/../profile",
  ]) {
    assert.equal(sanitizeInternalReturnTo(unsafe), null);
  }
  assert.equal(appConfig.expo.android.allowBackup, false);
  assert.deepEqual(appConfig.expo.android.blockedPermissions, [
    "android.permission.SYSTEM_ALERT_WINDOW",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_AUDIO",
    "android.permission.READ_MEDIA_VIDEO",
  ]);
});
