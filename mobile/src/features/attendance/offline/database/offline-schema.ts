export const offlineAttendanceDatabaseName = "haajar-attendance-cache.db";
export const offlineAttendanceSchemaVersion = 2;

export const offlineAttendanceSchemaV1 = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cached_groups (
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS cached_roll_calls (
  user_id TEXT NOT NULL,
  roll_call_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
  started_at TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (user_id, roll_call_id),
  FOREIGN KEY (user_id, group_id) REFERENCES cached_groups(user_id, group_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cached_profile_summaries (
  user_id TEXT NOT NULL,
  roll_call_id TEXT NOT NULL,
  profile_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  PRIMARY KEY (user_id, roll_call_id, profile_user_id),
  FOREIGN KEY (user_id, roll_call_id) REFERENCES cached_roll_calls(user_id, roll_call_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cached_roster_memberships (
  user_id TEXT NOT NULL,
  roll_call_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  profile_user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  role TEXT NOT NULL,
  membership_status TEXT NOT NULL CHECK (membership_status = 'active'),
  PRIMARY KEY (user_id, roll_call_id, membership_id),
  FOREIGN KEY (user_id, roll_call_id) REFERENCES cached_roll_calls(user_id, roll_call_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, roll_call_id, profile_user_id)
    REFERENCES cached_profile_summaries(user_id, roll_call_id, profile_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offline_sync_metadata (
  user_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('roll_call_roster')),
  scope_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  last_refreshed_at TEXT NOT NULL,
  member_count INTEGER NOT NULL CHECK (member_count >= 0),
  schema_version INTEGER NOT NULL,
  PRIMARY KEY (user_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS cached_roster_scope_idx
  ON cached_roster_memberships(user_id, event_id, group_id, roll_call_id);
CREATE INDEX IF NOT EXISTS offline_sync_scope_idx
  ON offline_sync_metadata(user_id, group_id, scope_id);
`;

export const offlineAttendanceSchemaV2 = `
CREATE TABLE IF NOT EXISTS cached_credential_verifiers (
  user_id TEXT NOT NULL, roll_call_id TEXT NOT NULL, membership_id TEXT NOT NULL,
  group_id TEXT NOT NULL, credential_hash TEXT NOT NULL CHECK(length(credential_hash) = 64),
  credential_version INTEGER NOT NULL, credential_status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY(user_id, roll_call_id, credential_hash),
  FOREIGN KEY(user_id, roll_call_id, membership_id)
    REFERENCES cached_roster_memberships(user_id, roll_call_id, membership_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS credential_verifier_lookup_idx
  ON cached_credential_verifiers(user_id, roll_call_id, group_id, credential_hash);

CREATE TABLE IF NOT EXISTS offline_attendance_queue (
  user_id TEXT NOT NULL, local_operation_id TEXT NOT NULL, roll_call_id TEXT NOT NULL,
  group_id TEXT NOT NULL, membership_id TEXT NOT NULL,
  marking_method TEXT NOT NULL CHECK(marking_method = 'offline_sync'),
  local_marked_at TEXT NOT NULL,
  sync_state TEXT NOT NULL CHECK(sync_state IN ('pending','syncing','synced','failed','conflict')),
  attempt_count INTEGER NOT NULL DEFAULT 0, next_retry_at TEXT, last_error_code TEXT,
  synced_at TEXT, created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, local_operation_id),
  UNIQUE(user_id, roll_call_id, membership_id)
);
CREATE INDEX IF NOT EXISTS offline_queue_pending_idx
  ON offline_attendance_queue(user_id, sync_state, next_retry_at);
`;
