export const offlineAttendanceDatabaseName = "haajar-attendance-cache.db";
export const offlineAttendanceSchemaVersion = 1;

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
