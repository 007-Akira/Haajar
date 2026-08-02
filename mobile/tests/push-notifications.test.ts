import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { sanitizeNotificationRoute } from "../src/features/notifications/config/notification-routing";

const eventId = "10000000-0000-4000-8000-000000000001";
const groupId = "20000000-0000-4000-8000-000000000002";
const rollCallId = "30000000-0000-4000-8000-000000000003";

const serviceSource = readFileSync(
  new URL("../src/features/notifications/services/push-notification-service.ts", import.meta.url),
  "utf8"
);
const providerSource = readFileSync(
  new URL("../src/features/notifications/providers/notification-provider.tsx", import.meta.url),
  "utf8"
);
const sessionSource = readFileSync(
  new URL("../src/features/auth/providers/session-provider.tsx", import.meta.url),
  "utf8"
);
const profileSettingsSource = readFileSync(
  new URL(
    "../src/features/notifications/components/push-notification-settings.tsx",
    import.meta.url
  ),
  "utf8"
);
const migrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260802001300_push_notification_foundation.sql",
    import.meta.url
  ),
  "utf8"
);
const workerSource = readFileSync(
  new URL("../../supabase/functions/send-push-notifications/index.ts", import.meta.url),
  "utf8"
);

test("notification taps accept only the operational route allowlist", () => {
  assert.equal(
    sanitizeNotificationRoute(`/events/${eventId}/groups/${groupId}/roll-calls/${rollCallId}`),
    `/events/${eventId}/groups/${groupId}/roll-calls/${rollCallId}`
  );
  assert.equal(
    sanitizeNotificationRoute(`/events/${eventId}/groups/${groupId}/join-requests`),
    `/events/${eventId}/groups/${groupId}/join-requests`
  );

  for (const route of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "haajar://groups",
    `/events/${eventId}/../profile`,
    `/events/${eventId}`,
    "/groups",
  ]) {
    assert.equal(sanitizeNotificationRoute(route), null, route);
  }
});

test("registration is authenticated RPC-only and persists no push token", () => {
  assert.match(serviceSource, /\.rpc\("register_push_device"/);
  assert.match(serviceSource, /\.rpc\("revoke_push_device"/);
  assert.match(serviceSource, /getExpoPushTokenAsync/);
  assert.doesNotMatch(serviceSource, /setItemAsync\([^,]+,\s*token/);
  assert.doesNotMatch(serviceSource, /console\.(log|debug|info|warn|error)/);
  assert.doesNotMatch(serviceSource, /AsyncStorage/);
});

test("permission is requested only from the explicit profile action", () => {
  assert.match(profileSettingsSource, /requestAndRegisterPushDevice/);
  assert.doesNotMatch(providerSource, /requestPermissionsAsync/);
  assert.match(providerSource, /addPushTokenListener/);
  assert.match(providerSource, /configureAndroidNotificationChannel/);
});

test("sign-out revokes this app instance before ending the session", () => {
  const revokeIndex = sessionSource.indexOf("await revokeCurrentPushDevice()");
  const signOutIndex = sessionSource.indexOf("auth.signOut()", revokeIndex);
  assert.ok(revokeIndex >= 0);
  assert.ok(signOutIndex > revokeIndex);
});

test("roll-call recipients are active group members and delivery is deduplicated", () => {
  assert.match(migrationSource, /membership\.status = 'active'/);
  assert.match(migrationSource, /device\.status = 'active'/);
  assert.match(migrationSource, /unique \(job_id, device_id\)/);
  assert.match(migrationSource, /'roll-call-started:' \|\| new\.roll_call_id/);
  assert.match(migrationSource, /'Roll call has started'/);
});

test("join-request alerts require an explicit organiser preference", () => {
  assert.match(migrationSource, /join_request_updates boolean not null default false/);
  assert.match(migrationSource, /preference\.join_request_updates/);
  assert.match(migrationSource, /membership\.role in \('organiser', 'super_organiser'\)/);
});

test("notification payloads and worker logs contain no sensitive member fields", () => {
  const payloadColumns = migrationSource.match(
    /create table public\.notification_jobs[\s\S]*?\n\);/
  )?.[0];
  assert.ok(payloadColumns);
  assert.doesNotMatch(payloadColumns, /phone|email|qr|registration_answer|push_token/);
  assert.doesNotMatch(workerSource, /console\.(log|debug|info|warn|error)/);
  assert.match(workerSource, /PUSH_WORKER_SECRET/);
  assert.match(workerSource, /SUPABASE_SERVICE_ROLE_KEY/);
});
