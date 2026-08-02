import type { RollCallDashboard } from "../../types/attendance-contracts";

export const offlineRosterFreshnessMs = 15 * 60 * 1000;

export type OfflineRosterState = "ready" | "downloading" | "outdated" | "unavailable" | "error";

export interface OfflineRosterStatus {
  state: OfflineRosterState;
  lastUpdatedAt: string | null;
  memberCount: number;
  errorMessage?: string;
}

export interface OfflineRosterCacheInput {
  userId: string;
  eventId: string;
  eventName: string;
  groupId: string;
  groupName: string;
  rollCallId: string;
  dashboard: RollCallDashboard;
}

export interface CachedOfflineRosterMember {
  membershipId: string;
  userId: string;
  displayName: string;
  phone: string | null;
  role: string;
}

export function isOfflineRosterStale(
  lastUpdatedAt: string | null,
  now = Date.now(),
  maximumAgeMs = offlineRosterFreshnessMs
): boolean {
  if (!lastUpdatedAt) return true;
  const timestamp = Date.parse(lastUpdatedAt);
  return !Number.isFinite(timestamp) || now - timestamp > maximumAgeMs;
}
