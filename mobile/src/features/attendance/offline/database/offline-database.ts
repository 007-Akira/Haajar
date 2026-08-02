import * as SQLite from "expo-sqlite";

import { AppError, appErrorCodes } from "@/lib/errors";

import {
  offlineAttendanceDatabaseName,
  offlineAttendanceSchemaV1,
  offlineAttendanceSchemaV2,
  offlineAttendanceSchemaVersion,
} from "./offline-schema";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getOfflineAttendanceDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openAndValidateDatabase();
  return databasePromise;
}

export async function recoverOfflineAttendanceDatabase(): Promise<SQLite.SQLiteDatabase> {
  const existing = databasePromise ? await databasePromise.catch(() => null) : null;
  databasePromise = null;
  if (existing) await existing.closeAsync().catch(() => undefined);
  await SQLite.deleteDatabaseAsync(offlineAttendanceDatabaseName).catch(() => undefined);
  databasePromise = openAndValidateDatabase(false);
  return databasePromise;
}

async function openAndValidateDatabase(allowRecovery = true): Promise<SQLite.SQLiteDatabase> {
  let database: SQLite.SQLiteDatabase | null = null;
  try {
    database = await SQLite.openDatabaseAsync(offlineAttendanceDatabaseName);
    await migrate(database);
    const integrity = await database.getFirstAsync<{ integrity_check: string }>(
      "PRAGMA integrity_check"
    );
    if (integrity?.integrity_check !== "ok") throw new Error("SQLite integrity check failed");
    return database;
  } catch (cause) {
    if (allowRecovery) {
      if (database) await database.closeAsync().catch(() => undefined);
      await SQLite.deleteDatabaseAsync(offlineAttendanceDatabaseName).catch(() => undefined);
      return openAndValidateDatabase(false);
    }
    throw new AppError({
      cause,
      code: appErrorCodes.database,
      message: "The offline roster cache is unavailable. Retry the roster download.",
      retryable: true,
    });
  }
}

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion > offlineAttendanceSchemaVersion) {
    throw new Error("Offline database is newer than this application build");
  }
  if (currentVersion < 1) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(offlineAttendanceSchemaV1);
      await transaction.execAsync("PRAGMA user_version = 1");
    });
  }
  if (currentVersion < 2) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(offlineAttendanceSchemaV2);
      await transaction.execAsync(`PRAGMA user_version = ${offlineAttendanceSchemaVersion}`);
    });
  }
}
