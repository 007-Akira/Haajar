import * as Crypto from "expo-crypto";

import { createClientOperationId } from "../../config/client-operation-id";
import {
  fetchOfflineRollCallBundle,
  syncOfflineAttendanceOperation,
} from "../api/offline-attendance-api";
import { getOfflineAttendanceDatabase } from "../database/offline-database";
import { getOfflineRosterStatus } from "./offline-roster-cache";

interface BundleMember {
  membership_id: string;
  credential_hash: string;
  credential_version: number;
  credential_status: string;
}
interface Bundle {
  roll_call_id: string;
  group_id: string;
  expires_at: string;
  members: BundleMember[];
}
export type OfflineResolution =
  | { status: "valid"; membershipId: string }
  | { status: "invalid" | "revoked" | "wrong_group" | "stale_roster" };

const activeSyncs = new Map<string, Promise<void>>();

export async function downloadOfflineVerifiers(userId: string, rollCallId: string): Promise<void> {
  const bundle = parseBundle(await fetchOfflineRollCallBundle(rollCallId));
  const database = await getOfflineAttendanceDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      "DELETE FROM cached_credential_verifiers WHERE user_id = ? AND roll_call_id = ?",
      userId,
      rollCallId
    );
    for (const member of bundle.members) {
      await transaction.runAsync(
        `INSERT INTO cached_credential_verifiers
         (user_id, roll_call_id, membership_id, group_id, credential_hash, credential_version, credential_status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        bundle.roll_call_id,
        member.membership_id,
        bundle.group_id,
        member.credential_hash,
        member.credential_version,
        member.credential_status,
        bundle.expires_at
      );
    }
  });
}

export async function resolveOfflineQr(input: {
  userId: string;
  rollCallId: string;
  groupId: string;
  payload: string;
}): Promise<OfflineResolution> {
  const roster = await getOfflineRosterStatus(input.userId, input.rollCallId);
  if (roster.state !== "ready") return { status: "stale_roster" };
  const match = /^hjr:([1-9][0-9]{0,8}):([a-f0-9]{64})$/i.exec(input.payload.trim());
  if (!match) return { status: "invalid" };
  const tokenHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    match[2].toLowerCase()
  );
  const database = await getOfflineAttendanceDatabase();
  const row = await database.getFirstAsync<{
    membership_id: string;
    group_id: string;
    credential_status: string;
    credential_version: number;
    expires_at: string;
  }>(
    `SELECT membership_id, group_id, credential_status, credential_version, expires_at
     FROM cached_credential_verifiers
     WHERE user_id = ? AND roll_call_id = ? AND credential_hash = ?`,
    input.userId,
    input.rollCallId,
    tokenHash
  );
  if (!row) return { status: "invalid" };
  if (row.group_id !== input.groupId) return { status: "wrong_group" };
  if (row.credential_status !== "active") return { status: "revoked" };
  if (row.credential_version !== Number(match[1])) return { status: "invalid" };
  if (Date.parse(row.expires_at) <= Date.now()) {
    await database.runAsync(
      "DELETE FROM cached_credential_verifiers WHERE user_id = ? AND roll_call_id = ?",
      input.userId,
      input.rollCallId
    );
    return { status: "stale_roster" };
  }
  return { status: "valid", membershipId: row.membership_id };
}

export async function enqueueOfflineAttendance(input: {
  userId: string;
  rollCallId: string;
  groupId: string;
  membershipId: string;
}) {
  const database = await getOfflineAttendanceDatabase();
  const operationId = createClientOperationId();
  const markedAt = new Date().toISOString();
  const result = await database.runAsync(
    `INSERT INTO offline_attendance_queue
     (user_id, local_operation_id, roll_call_id, group_id, membership_id, marking_method, local_marked_at, sync_state, created_at)
     VALUES (?, ?, ?, ?, ?, 'offline_sync', ?, 'pending', ?)
     ON CONFLICT(user_id, roll_call_id, membership_id) DO NOTHING`,
    input.userId,
    operationId,
    input.rollCallId,
    input.groupId,
    input.membershipId,
    markedAt,
    markedAt
  );
  return { operationId, markedAt, inserted: result.changes > 0 };
}

export async function getPendingSyncCount(userId: string, rollCallId: string): Promise<number> {
  const database = await getOfflineAttendanceDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT count(*) AS count FROM offline_attendance_queue WHERE user_id = ? AND roll_call_id = ? AND sync_state IN ('pending','syncing','failed')",
    userId,
    rollCallId
  );
  return row?.count ?? 0;
}

export async function syncPendingAttendance(userId: string, rollCallId: string): Promise<void> {
  const key = `${userId}:${rollCallId}`;
  const existing = activeSyncs.get(key);
  if (existing) return existing;
  const operation = runPendingAttendanceSync(userId, rollCallId);
  activeSyncs.set(key, operation);
  try {
    await operation;
  } finally {
    activeSyncs.delete(key);
  }
}

async function runPendingAttendanceSync(userId: string, rollCallId: string): Promise<void> {
  const database = await getOfflineAttendanceDatabase();
  await database.runAsync(
    "UPDATE offline_attendance_queue SET sync_state = 'pending' WHERE user_id = ? AND roll_call_id = ? AND sync_state = 'syncing'",
    userId,
    rollCallId
  );
  const rows = await database.getAllAsync<{
    local_operation_id: string;
    membership_id: string;
    local_marked_at: string;
    attempt_count: number;
  }>(
    "SELECT local_operation_id, membership_id, local_marked_at, attempt_count FROM offline_attendance_queue WHERE user_id = ? AND roll_call_id = ? AND sync_state IN ('pending','failed') AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY created_at",
    userId,
    rollCallId,
    new Date().toISOString()
  );
  for (const row of rows) {
    await database.runAsync(
      "UPDATE offline_attendance_queue SET sync_state = 'syncing' WHERE user_id = ? AND local_operation_id = ?",
      userId,
      row.local_operation_id
    );
    try {
      const result = await syncOfflineAttendanceOperation({
        operationId: row.local_operation_id,
        rollCallId,
        membershipId: row.membership_id,
        localMarkedAt: row.local_marked_at,
      });
      const success =
        result?.result_status === "marked_present" || result?.result_status === "already_marked";
      const conflict = [
        "closed",
        "inactive_membership",
        "wrong_group",
        "not_rostered",
        "archived",
      ].includes(result?.result_status ?? "");
      await database.runAsync(
        "UPDATE offline_attendance_queue SET sync_state = ?, synced_at = ?, last_error_code = ? WHERE user_id = ? AND local_operation_id = ?",
        success ? "synced" : conflict ? "conflict" : "failed",
        success ? new Date().toISOString() : null,
        success ? null : (result?.result_status ?? "UNKNOWN"),
        userId,
        row.local_operation_id
      );
    } catch {
      const attempts = row.attempt_count + 1;
      const retryAt = new Date(Date.now() + Math.min(300000, 2000 * 2 ** attempts)).toISOString();
      await database.runAsync(
        "UPDATE offline_attendance_queue SET sync_state = 'failed', attempt_count = ?, next_retry_at = ?, last_error_code = 'NETWORK' WHERE user_id = ? AND local_operation_id = ?",
        attempts,
        retryAt,
        userId,
        row.local_operation_id
      );
    }
  }
  await database.runAsync(
    "DELETE FROM offline_attendance_queue WHERE user_id = ? AND sync_state = 'synced' AND synced_at < ?",
    userId,
    new Date(Date.now() - 86400000).toISOString()
  );
}

function parseBundle(value: unknown): Bundle {
  if (!value || typeof value !== "object") throw new Error("Invalid offline bundle");
  const bundle = value as Bundle;
  if (
    !Array.isArray(bundle.members) ||
    !bundle.roll_call_id ||
    !bundle.group_id ||
    !bundle.expires_at
  )
    throw new Error("Invalid offline bundle");
  if (
    !Number.isFinite(Date.parse(bundle.expires_at)) ||
    bundle.members.some(
      (member) =>
        !member.membership_id ||
        !/^[a-f0-9]{64}$/i.test(member.credential_hash) ||
        !Number.isInteger(member.credential_version) ||
        !["active", "revoked"].includes(member.credential_status)
    )
  )
    throw new Error("Invalid offline bundle");
  return bundle;
}
