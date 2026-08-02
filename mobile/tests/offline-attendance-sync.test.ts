import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(
  new URL("../src/features/attendance/offline/database/offline-schema.ts", import.meta.url),
  "utf8"
);
const queue = readFileSync(
  new URL(
    "../src/features/attendance/offline/services/offline-attendance-queue.ts",
    import.meta.url
  ),
  "utf8"
);
const scanner = readFileSync(
  new URL("../src/features/attendance/screens/scanner-screen.tsx", import.meta.url),
  "utf8"
);
const migration = readFileSync(
  new URL("../../supabase/migrations/20260802001400_offline_attendance_sync.sql", import.meta.url),
  "utf8"
);

test("offline cache is scoped, expiring, and stores hashes rather than raw QR payloads", () => {
  assert.match(schema, /offlineAttendanceSchemaVersion = 2/);
  assert.match(schema, /credential_hash TEXT NOT NULL/);
  assert.match(schema, /expires_at TEXT NOT NULL/);
  assert.doesNotMatch(schema, /plaintext|presented_token|qr_token/i);
  assert.doesNotMatch(queue, /INSERT[^;]+presented|push_token|AsyncStorage|SecureStore/i);
});

test("offline resolution handles stale, wrong-group, revoked, and valid credentials", () => {
  assert.match(queue, /stale_roster/);
  assert.match(queue, /wrong_group/);
  assert.match(queue, /credential_status !== "active"/);
  assert.match(queue, /status: "valid", membershipId/);
  assert.match(queue, /WHERE user_id = \? AND roll_call_id = \? AND credential_hash = \?/);
});

test("queue is persistent, idempotent, user scoped, and contains no raw token", () => {
  assert.match(schema, /PRIMARY KEY\(user_id, local_operation_id\)/);
  assert.match(schema, /UNIQUE\(user_id, roll_call_id, membership_id\)/);
  assert.match(queue, /ON CONFLICT\(user_id, roll_call_id, membership_id\) DO NOTHING/);
  assert.match(queue, /operationId: row\.local_operation_id/);
  assert.doesNotMatch(
    schema.match(/CREATE TABLE IF NOT EXISTS offline_attendance_queue[\s\S]*?;\n/)?.[0] ?? "",
    /token|hash/
  );
});

test("sync reconciles already marked and preserves authority conflicts", () => {
  assert.match(queue, /"already_marked"/);
  assert.match(queue, /"closed"/);
  assert.match(queue, /"inactive_membership"/);
  assert.match(queue, /sync_state = 'failed'/);
  assert.match(queue, /2000 \* 2 \*\* attempts/);
  assert.match(migration, /private\.record_unit_attendance/);
  assert.match(migration, /attendance_unit_operators/);
  assert.match(migration, /unit\.unit_type<>'subgroup'/);
});

test("scanner distinguishes offline verification and never reports it as synced", () => {
  assert.match(scanner, /OFFLINE READY/);
  assert.match(scanner, /Saved — Pending Sync/);
  assert.match(scanner, /resolveOfflineQr/);
  assert.match(scanner, /enqueueOfflineAttendance/);
  assert.doesNotMatch(scanner, /console\.(log|debug|info|warn|error)/);
});
