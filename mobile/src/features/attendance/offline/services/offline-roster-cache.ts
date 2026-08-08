import { AppError, appErrorCodes } from "@/lib/errors";

import { getOfflineAttendanceDatabase } from "../database/offline-database";
import { offlineAttendanceSchemaVersion } from "../database/offline-schema";
import {
  isOfflineRosterStale,
  type CachedOfflineRosterMember,
  type OfflineRosterCacheInput,
  type OfflineRosterStatus,
} from "../types/offline-roster";

interface SyncMetadataRow {
  last_refreshed_at: string;
  member_count: number;
}

export type OfflineLifecycleScope = { eventId: string } | { groupId: string };

export async function getPendingLifecycleAttendanceCount(
  userId: string,
  scope: OfflineLifecycleScope
): Promise<number> {
  try {
    const database = await getOfflineAttendanceDatabase();
    const row =
      "groupId" in scope
        ? await database.getFirstAsync<{ count: number }>(
            `SELECT count(*) AS count FROM offline_attendance_queue
           WHERE user_id = ? AND group_id = ? AND sync_state IN ('pending','syncing','failed')`,
            userId,
            scope.groupId
          )
        : await database.getFirstAsync<{ count: number }>(
            `SELECT count(*) AS count FROM offline_attendance_queue AS queue
           JOIN cached_groups AS groups
             ON groups.user_id = queue.user_id AND groups.group_id = queue.group_id
           WHERE queue.user_id = ? AND groups.event_id = ?
             AND queue.sync_state IN ('pending','syncing','failed')`,
            userId,
            scope.eventId
          );
    return row?.count ?? 0;
  } catch (cause) {
    throw storageError(cause);
  }
}

export async function clearLifecycleOfflineCache(
  userId: string,
  scope: OfflineLifecycleScope
): Promise<void> {
  try {
    const database = await getOfflineAttendanceDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      if ("groupId" in scope) {
        await transaction.runAsync(
          "DELETE FROM offline_attendance_queue WHERE user_id = ? AND group_id = ?",
          userId,
          scope.groupId
        );
        await transaction.runAsync(
          "DELETE FROM offline_sync_metadata WHERE user_id = ? AND group_id = ?",
          userId,
          scope.groupId
        );
        await transaction.runAsync(
          "DELETE FROM cached_groups WHERE user_id = ? AND group_id = ?",
          userId,
          scope.groupId
        );
      } else {
        await transaction.runAsync(
          `DELETE FROM offline_attendance_queue WHERE user_id = ? AND group_id IN
            (SELECT group_id FROM cached_groups WHERE user_id = ? AND event_id = ?)`,
          userId,
          userId,
          scope.eventId
        );
        await transaction.runAsync(
          "DELETE FROM offline_sync_metadata WHERE user_id = ? AND event_id = ?",
          userId,
          scope.eventId
        );
        await transaction.runAsync(
          "DELETE FROM cached_groups WHERE user_id = ? AND event_id = ?",
          userId,
          scope.eventId
        );
      }
    });
  } catch (cause) {
    throw storageError(cause);
  }
}

export async function replaceOfflineRosterCache(
  input: OfflineRosterCacheInput
): Promise<OfflineRosterStatus> {
  if (input.dashboard.rollCall.status !== "active") {
    await invalidateOfflineRoster(input.userId, input.rollCallId);
    return unavailableStatus();
  }
  const members = [...input.dashboard.presentMembers, ...input.dashboard.remainingMembers];
  const cachedAt = new Date().toISOString();
  try {
    const database = await getOfflineAttendanceDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO cached_groups
          (user_id, event_id, group_id, event_name, group_name, cached_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, group_id) DO UPDATE SET
          event_id = excluded.event_id, event_name = excluded.event_name,
          group_name = excluded.group_name, cached_at = excluded.cached_at`,
        input.userId,
        input.eventId,
        input.groupId,
        input.eventName,
        input.groupName,
        cachedAt
      );
      await transaction.runAsync(
        `INSERT INTO cached_roll_calls
          (user_id, roll_call_id, event_id, group_id, title, status, started_at, cached_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
         ON CONFLICT(user_id, roll_call_id) DO UPDATE SET
          event_id = excluded.event_id, group_id = excluded.group_id, title = excluded.title,
          status = excluded.status, started_at = excluded.started_at, cached_at = excluded.cached_at`,
        input.userId,
        input.rollCallId,
        input.eventId,
        input.groupId,
        input.dashboard.rollCall.title,
        input.dashboard.rollCall.startedAt,
        cachedAt
      );
      await transaction.runAsync(
        "DELETE FROM cached_roster_memberships WHERE user_id = ? AND roll_call_id = ?",
        input.userId,
        input.rollCallId
      );
      await transaction.runAsync(
        "DELETE FROM cached_profile_summaries WHERE user_id = ? AND roll_call_id = ?",
        input.userId,
        input.rollCallId
      );
      for (const member of members) {
        await transaction.runAsync(
          `INSERT INTO cached_profile_summaries
            (user_id, roll_call_id, profile_user_id, display_name, phone)
           VALUES (?, ?, ?, ?, ?)`,
          input.userId,
          input.rollCallId,
          member.userId,
          member.displayName,
          member.phone
        );
        await transaction.runAsync(
          `INSERT INTO cached_roster_memberships
            (user_id, roll_call_id, membership_id, profile_user_id, event_id, group_id, role, membership_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          input.userId,
          input.rollCallId,
          member.membershipId,
          member.userId,
          input.eventId,
          input.groupId,
          member.role
        );
      }
      await transaction.runAsync(
        `INSERT INTO offline_sync_metadata
          (user_id, scope_type, scope_id, event_id, group_id, last_refreshed_at, member_count, schema_version)
         VALUES (?, 'roll_call_roster', ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, scope_type, scope_id) DO UPDATE SET
          event_id = excluded.event_id, group_id = excluded.group_id,
          last_refreshed_at = excluded.last_refreshed_at,
          member_count = excluded.member_count, schema_version = excluded.schema_version`,
        input.userId,
        input.rollCallId,
        input.eventId,
        input.groupId,
        cachedAt,
        members.length,
        offlineAttendanceSchemaVersion
      );
    });
    return { state: "ready", lastUpdatedAt: cachedAt, memberCount: members.length };
  } catch (cause) {
    throw storageError(cause);
  }
}

export async function getOfflineRosterStatus(
  userId: string,
  rollCallId: string
): Promise<OfflineRosterStatus> {
  try {
    const database = await getOfflineAttendanceDatabase();
    const row = await database.getFirstAsync<SyncMetadataRow>(
      `SELECT last_refreshed_at, member_count FROM offline_sync_metadata
       WHERE user_id = ? AND scope_type = 'roll_call_roster' AND scope_id = ?`,
      userId,
      rollCallId
    );
    if (!row) return unavailableStatus();
    return {
      state: isOfflineRosterStale(row.last_refreshed_at) ? "outdated" : "ready",
      lastUpdatedAt: row.last_refreshed_at,
      memberCount: row.member_count,
    };
  } catch (cause) {
    throw storageError(cause);
  }
}

export async function getCachedOfflineRoster(
  userId: string,
  rollCallId: string
): Promise<CachedOfflineRosterMember[]> {
  try {
    const database = await getOfflineAttendanceDatabase();
    return database.getAllAsync<CachedOfflineRosterMember>(
      `SELECT membership.membership_id AS membershipId,
        membership.profile_user_id AS userId,
        profile.display_name AS displayName,
        profile.phone AS phone,
        membership.role AS role
       FROM cached_roster_memberships AS membership
       JOIN cached_profile_summaries AS profile
         ON profile.user_id = membership.user_id
        AND profile.roll_call_id = membership.roll_call_id
        AND profile.profile_user_id = membership.profile_user_id
       WHERE membership.user_id = ? AND membership.roll_call_id = ?
       ORDER BY profile.display_name COLLATE NOCASE`,
      userId,
      rollCallId
    );
  } catch (cause) {
    throw storageError(cause);
  }
}

export async function invalidateOfflineRoster(userId: string, rollCallId: string): Promise<void> {
  try {
    const database = await getOfflineAttendanceDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        "DELETE FROM offline_sync_metadata WHERE user_id = ? AND scope_id = ?",
        userId,
        rollCallId
      );
      await transaction.runAsync(
        "DELETE FROM cached_roll_calls WHERE user_id = ? AND roll_call_id = ?",
        userId,
        rollCallId
      );
    });
  } catch (cause) {
    throw storageError(cause);
  }
}

export async function clearOfflineAttendanceCache(userId?: string): Promise<void> {
  try {
    const database = await getOfflineAttendanceDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      if (userId) {
        await transaction.runAsync(
          "DELETE FROM offline_attendance_queue WHERE user_id = ?",
          userId
        );
        await transaction.runAsync("DELETE FROM offline_sync_metadata WHERE user_id = ?", userId);
        await transaction.runAsync("DELETE FROM cached_groups WHERE user_id = ?", userId);
      } else {
        await transaction.execAsync(`
          DELETE FROM offline_attendance_queue;
          DELETE FROM offline_sync_metadata;
          DELETE FROM cached_groups;
        `);
      }
    });
  } catch (cause) {
    throw storageError(cause);
  }
}

function unavailableStatus(): OfflineRosterStatus {
  return { state: "unavailable", lastUpdatedAt: null, memberCount: 0 };
}

function storageError(cause: unknown): AppError {
  return new AppError({
    cause,
    code: appErrorCodes.database,
    message: "The offline roster cache could not be updated. Online attendance remains available.",
    retryable: true,
  });
}
