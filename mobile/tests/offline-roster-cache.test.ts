import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isOfflineRosterStale,
  offlineRosterFreshnessMs,
} from "../src/features/attendance/offline/types/offline-roster";

const schemaSource = readFileSync(
  new URL("../src/features/attendance/offline/database/offline-schema.ts", import.meta.url),
  "utf8"
);
const databaseSource = readFileSync(
  new URL("../src/features/attendance/offline/database/offline-database.ts", import.meta.url),
  "utf8"
);
const cacheSource = readFileSync(
  new URL("../src/features/attendance/offline/services/offline-roster-cache.ts", import.meta.url),
  "utf8"
);
const sessionSource = readFileSync(
  new URL("../src/features/auth/providers/session-provider.tsx", import.meta.url),
  "utf8"
);

test("offline schema is versioned and all operational tables are user scoped", () => {
  assert.match(schemaSource, /offlineAttendanceSchemaVersion = 2/);
  for (const table of [
    "cached_groups",
    "cached_roll_calls",
    "cached_profile_summaries",
    "cached_roster_memberships",
    "offline_sync_metadata",
    "cached_credential_verifiers",
    "offline_attendance_queue",
  ]) {
    const definition = schemaSource.match(
      new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\);`)
    )?.[1];
    assert.ok(definition, table);
    assert.match(definition, /user_id TEXT NOT NULL/, table);
  }
  assert.match(databaseSource, /PRAGMA user_version/);
  assert.match(databaseSource, /withExclusiveTransactionAsync/);
});

test("stale detection never silently accepts missing, malformed, or old metadata", () => {
  const now = Date.parse("2026-08-02T12:00:00.000Z");
  assert.equal(isOfflineRosterStale(null, now), true);
  assert.equal(isOfflineRosterStale("not-a-date", now), true);
  assert.equal(
    isOfflineRosterStale(new Date(now - offlineRosterFreshnessMs + 1).toISOString(), now),
    false
  );
  assert.equal(
    isOfflineRosterStale(new Date(now - offlineRosterFreshnessMs - 1).toISOString(), now),
    true
  );
});

test("roster replacement is atomic and removes members absent from the latest snapshot", () => {
  assert.match(cacheSource, /withExclusiveTransactionAsync/);
  const deleteIndex = cacheSource.indexOf("DELETE FROM cached_roster_memberships");
  const insertIndex = cacheSource.indexOf("INSERT INTO cached_roster_memberships");
  assert.ok(deleteIndex >= 0);
  assert.ok(insertIndex > deleteIndex);
  assert.match(cacheSource, /ON CONFLICT\(user_id, scope_type, scope_id\) DO UPDATE/);
});

test("every cache read and destructive operation requires a user scope", () => {
  assert.match(cacheSource, /WHERE membership\.user_id = \? AND membership\.roll_call_id = \?/);
  assert.match(cacheSource, /DELETE FROM cached_groups WHERE user_id = \?/);
  assert.match(
    cacheSource,
    /DELETE FROM cached_roll_calls WHERE user_id = \? AND roll_call_id = \?/
  );
});

test("sign-out clears local attendance data before ending the hosted session", () => {
  const clearIndex = sessionSource.indexOf("await clearOfflineAttendanceCache");
  const signOutIndex = sessionSource.indexOf("auth.signOut()", clearIndex);
  assert.ok(clearIndex >= 0);
  assert.ok(signOutIndex > clearIndex);
  assert.match(sessionSource, /onAuthStateChange[\s\S]*clearOfflineAttendanceCache/);
});

test("corrupt databases are deleted and rebuilt from the versioned schema", () => {
  assert.match(databaseSource, /PRAGMA integrity_check/);
  assert.match(databaseSource, /deleteDatabaseAsync/);
  assert.match(databaseSource, /openAndValidateDatabase\(false\)/);
});

test("offline storage contains no credential or authentication secret fields", () => {
  assert.doesNotMatch(
    schemaSource,
    /plaintext|token_hash|token_ciphertext|qr_token|invitation_token|access_token|refresh_token|registration_answer/i
  );
  assert.doesNotMatch(cacheSource, /presentedToken|push_token|SecureStore|AsyncStorage/);
  assert.doesNotMatch(cacheSource, /console\.(log|debug|info|warn|error)/);
});
