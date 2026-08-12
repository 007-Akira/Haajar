import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { sanitizeNotificationRoute } from "../src/features/notifications/config/notification-routing";
import {
  classifyTokenFailure,
  resolveEasProjectId,
  safePushRegistrationMessage,
  toPushPermissionState,
} from "../src/features/notifications/config/push-registration-contract";

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
const hardeningMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260802002000_harden_push_delivery_routes.sql",
    import.meta.url
  ),
  "utf8"
);
const attendanceNotificationMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260808000300_attendance_start_notifications.sql",
    import.meta.url
  ),
  "utf8"
);
const workerSource = readFileSync(
  new URL("../../supabase/functions/send-push-notifications/index.ts", import.meta.url),
  "utf8"
);
const inboxMigrationSource = readFileSync(
  new URL("../../supabase/migrations/20260808000500_notification_inbox.sql", import.meta.url),
  "utf8"
);
const recipientMigrationSource = readFileSync(
  new URL("../../supabase/migrations/20260808000600_notification_recipients.sql", import.meta.url),
  "utf8"
);
const inboxScreenSource = readFileSync(
  new URL("../src/features/notifications/screens/notifications-screen.tsx", import.meta.url),
  "utf8"
);
const inboxApiSource = readFileSync(
  new URL("../src/features/notifications/api/notification-queries.ts", import.meta.url),
  "utf8"
);
const foregroundAlertApiSource = readFileSync(
  new URL("../src/features/notifications/api/foreground-attendance-alerts.ts", import.meta.url),
  "utf8"
);
const foregroundAlertMigrationSource = readFileSync(
  new URL(
    "../../supabase/migrations/20260812000300_foreground_attendance_alerts.sql",
    import.meta.url
  ),
  "utf8"
);

test("notification taps accept only the operational route allowlist", () => {
  assert.equal(sanitizeNotificationRoute(`/events/${eventId}`), `/events/${eventId}`);
  assert.equal(
    sanitizeNotificationRoute(`/events/${eventId}/groups/${groupId}`),
    `/events/${eventId}/groups/${groupId}`
  );
  assert.equal(
    sanitizeNotificationRoute(`/events/${eventId}/attendance/general/${rollCallId}`),
    `/events/${eventId}/attendance/general/${rollCallId}`
  );
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
  assert.doesNotMatch(
    serviceSource,
    /console\.(log|debug|info|warn|error)\([^\n]*(token|push_token)/i
  );
  assert.doesNotMatch(serviceSource, /AsyncStorage/);
});

test("EAS project ID resolution prefers the native verified ID and fails when absent", () => {
  const verified = "2766c8f7-998f-4c73-8c3a-96ffcfd5b51d";
  assert.equal(resolveEasProjectId(verified, "fallback"), verified);
  assert.equal(resolveEasProjectId(undefined, verified), verified);
  assert.equal(resolveEasProjectId(undefined, undefined), null);
  assert.match(serviceSource, /getEasProjectId/);
  assert.match(serviceSource, /missing_project_id/);
});

test("permission state distinguishes unrequested, granted, and denied", () => {
  assert.equal(toPushPermissionState({ granted: false, status: "undetermined" }), "not_requested");
  assert.equal(toPushPermissionState({ granted: true, status: "granted" }), "enabled");
  assert.equal(toPushPermissionState({ granted: false, status: "denied" }), "denied");
  assert.match(profileSettingsSource, /state === "denied"[\s\S]*?"DISABLED"/);
  assert.match(profileSettingsSource, /label="OPEN SETTINGS"/);
  assert.match(profileSettingsSource, /Linking\.openSettings/);
});

test("token, network, configuration, and backend failures remain distinct and retryable", () => {
  assert.equal(classifyTokenFailure(new Error("FCM FirebaseApp missing")), "configuration_error");
  assert.equal(classifyTokenFailure(new Error("Network request failed")), "network_failure");
  assert.equal(
    classifyTokenFailure(new Error("provider rejected token request")),
    "expo_token_failure"
  );
  assert.match(serviceSource, /backend_registration_failure/);
  assert.match(profileSettingsSource, /onPress=\{\(\) => void enable\(\)\}/);
  assert.match(profileSettingsSource, /registrationFailed \? "TRY AGAIN"/);
  assert.equal(
    safePushRegistrationMessage("backend_registration_failure"),
    "Notifications are allowed, but this device could not be registered. Try again."
  );
});

test("successful registration sets Enabled and diagnostics never receive the token", () => {
  assert.match(serviceSource, /diagnose\("registered"\)/);
  assert.match(serviceSource, /return "enabled"/);
  assert.match(serviceSource, /function diagnose\(stage: string\)/);
  assert.doesNotMatch(serviceSource, /diagnose\(\s*(token|pushToken|push_token)\s*\)/);
  assert.doesNotMatch(
    providerSource,
    /query(Client)?\.(setQueryData|setQueriesData)[^\n]*(token|push)/i
  );
});

test("permission is requested only from the explicit profile action", () => {
  assert.match(profileSettingsSource, /requestAndRegisterPushDevice/);
  assert.doesNotMatch(providerSource, /requestPermissionsAsync/);
  assert.doesNotMatch(providerSource, /addPushTokenListener|registerCurrentExpoPushToken/);
  assert.match(providerSource, /configureAndroidNotificationChannel/);
});

test("Firebase-free beta hides remote push registration from Profile", () => {
  const profileSource = readFileSync(
    new URL("../src/app/(tabs)/profile.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(profileSource, /PushNotificationSettings|Roll-call notifications/);
});

test("foreground attendance starts use authorised realtime and an actionable in-app banner", () => {
  assert.match(foregroundAlertMigrationSource, /supabase_realtime.*attendance_sessions/s);
  assert.match(foregroundAlertMigrationSource, /can_view_attendance_session/);
  assert.match(foregroundAlertMigrationSource, /get_attendance_alert_context/);
  assert.match(foregroundAlertApiSource, /table: "attendance_sessions"/);
  assert.match(foregroundAlertApiSource, /event: "INSERT"/);
  assert.match(providerSource, /foreground-attendance-banner/);
  assert.match(providerSource, /Attendance started/);
  assert.match(providerSource, /router\.push\(alert\.route/);
});

test("local attendance notification is best-effort and never requests permission", () => {
  assert.match(providerSource, /getPermissionsAsync/);
  assert.match(providerSource, /permission\.granted/);
  assert.match(providerSource, /scheduleNotificationAsync/);
  assert.doesNotMatch(providerSource, /requestPermissionsAsync|getExpoPushTokenAsync|push_token/);
});

test("sign-out revokes this app instance before ending the session", () => {
  const revokeIndex = sessionSource.indexOf("await revokeCurrentPushDevice()");
  const signOutIndex = sessionSource.indexOf("auth.signOut()", revokeIndex);
  assert.ok(revokeIndex >= 0);
  assert.ok(signOutIndex > revokeIndex);
});

test("attendance-session recipients come from the active snapshot and delivery is deduplicated", () => {
  assert.match(migrationSource, /membership\.status = 'active'/);
  assert.match(migrationSource, /device\.status = 'active'/);
  assert.match(migrationSource, /unique \(job_id, device_id\)/);
  assert.match(migrationSource, /'attendance-session-started:' \|\| new\.session_id/);
  assert.match(migrationSource, /attendance_unit_roster/);
  assert.match(migrationSource, /'Roll call has started'/);
  assert.match(hardeningMigrationSource, /attendance_unit_roster/);
  assert.match(hardeningMigrationSource, /event_membership\.status = 'active'/);
  assert.match(hardeningMigrationSource, /group_membership\.status = 'active'/);
  assert.match(hardeningMigrationSource, /session\.scope_type = 'general'/);
  assert.match(hardeningMigrationSource, /roster\.user_id = delivery\.user_id/);
  assert.match(hardeningMigrationSource, /device\.status = 'active'/);
  assert.match(hardeningMigrationSource, /attendance\/general\/' \|\| new\.session_id/);
  assert.match(attendanceNotificationMigrationSource, /'Roll call is active'/);
  assert.match(
    attendanceNotificationMigrationSource,
    /target_event\.name \|\| ' • ' \|\| scope_label/
  );
  assert.match(attendanceNotificationMigrationSource, /'Started by: ' \|\| organiser_name/);
  assert.match(attendanceNotificationMigrationSource, /'Started by an organiser'/);
  assert.match(attendanceNotificationMigrationSource, /target_session\.category_group_id/);
  assert.match(attendanceNotificationMigrationSource, /target_group\.group_kind = 'operational'/);
  assert.match(attendanceNotificationMigrationSource, /device\.status = 'active'/);
  assert.match(
    attendanceNotificationMigrationSource,
    /on conflict \(job_id, device_id\) do nothing/
  );
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
  assert.match(workerSource, /isAllowedInternalRoute/);
  assert.match(workerSource, /INVALID_NOTIFICATION_ROUTE/);
  assert.match(workerSource, /request\.method !== "POST"/);
});

test("notification tab uses a secured user-scoped inbox with safe routes", () => {
  assert.match(inboxApiSource, /rpc\("list_my_notifications"/);
  assert.match(inboxScreenSource, /useNotificationInbox/);
  assert.match(inboxScreenSource, /sanitizeNotificationRoute/);
  assert.match(inboxScreenSource, /notifications-empty/);
  assert.match(inboxScreenSource, /onRefresh/);
  assert.doesNotMatch(inboxScreenSource, /getSupabaseClient|\.from\(|\.insert\(|\.update\(/);
  assert.match(inboxMigrationSource, /delivery\.user_id = caller_id/);
  assert.match(inboxMigrationSource, /security definer/);
  assert.match(inboxMigrationSource, /set search_path = ''/);
  assert.match(inboxMigrationSource, /grant execute.*authenticated/s);
  assert.doesNotMatch(inboxMigrationSource, /token_ciphertext|token_hash|phone|email|qr/);
  assert.match(recipientMigrationSource, /create table public\.notification_recipients/);
  assert.match(recipientMigrationSource, /primary key \(job_id, user_id\)/);
  assert.match(recipientMigrationSource, /values \(queued_job_id, new\.user_id\)/);
  assert.match(recipientMigrationSource, /recipient\.user_id = caller_id/);
  assert.match(recipientMigrationSource, /now\(\) - interval '7 days'/);
  assert.match(recipientMigrationSource, /left join public\.notification_deliveries/);
});
