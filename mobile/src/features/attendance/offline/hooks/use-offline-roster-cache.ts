import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/features/auth";
import type { GroupDetail } from "@/features/groups/types/group";

import type { RollCallDashboard } from "../../types/attendance-contracts";
import {
  getOfflineRosterStatus,
  invalidateOfflineRoster,
  replaceOfflineRosterCache,
} from "../services/offline-roster-cache";
import { downloadOfflineVerifiers } from "../services/offline-attendance-queue";
import type { OfflineRosterStatus } from "../types/offline-roster";
import { offlineRosterFreshnessMs } from "../types/offline-roster";

const initialStatus: OfflineRosterStatus = {
  state: "unavailable",
  lastUpdatedAt: null,
  memberCount: 0,
};

export function useOfflineRosterCache(
  dashboard: RollCallDashboard | undefined,
  group: GroupDetail | undefined,
  rollCallId?: string,
  accessRevoked = false
) {
  const { user } = useSession();
  const [status, setStatus] = useState<OfflineRosterStatus>(initialStatus);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (
      !user ||
      !dashboard ||
      !group ||
      dashboard.rollCall.status !== "active" ||
      group.status !== "active" ||
      group.eventStatus !== "active"
    )
      return false;
    setStatus((current) => ({ ...current, state: "downloading", errorMessage: undefined }));
    try {
      const nextStatus = await replaceOfflineRosterCache({
        dashboard,
        eventId: dashboard.rollCall.eventId,
        eventName: group.eventName ?? "Trip",
        groupId: dashboard.rollCall.groupId,
        groupName: group.name,
        rollCallId: dashboard.rollCall.id,
        userId: user.id,
      });
      await downloadOfflineVerifiers(user.id, dashboard.rollCall.id);
      setStatus(nextStatus);
      return true;
    } catch {
      if (user && dashboard) {
        await invalidateOfflineRoster(user.id, dashboard.rollCall.id).catch(() => undefined);
      }
      setStatus((current) => ({
        ...current,
        state: "error",
        errorMessage: "Roster download failed. Online attendance is still available.",
      }));
      return false;
    }
  }, [dashboard, group, user]);

  useEffect(() => {
    if (!user || !dashboard) return;
    if (
      dashboard.rollCall.status !== "active" ||
      group?.status !== "active" ||
      group.eventStatus !== "active"
    ) {
      void invalidateOfflineRoster(user.id, dashboard.rollCall.id).finally(() =>
        setStatus(initialStatus)
      );
      return;
    }
    void getOfflineRosterStatus(user.id, dashboard.rollCall.id)
      .then(setStatus)
      .catch(() => setStatus({ ...initialStatus, state: "error" }));
  }, [dashboard, group?.eventStatus, group?.status, user]);

  useEffect(() => {
    if (!user || !rollCallId || !accessRevoked) return;
    void invalidateOfflineRoster(user.id, rollCallId).finally(() => setStatus(initialStatus));
  }, [accessRevoked, rollCallId, user]);

  useEffect(() => {
    if (status.state !== "ready" || !status.lastUpdatedAt) return undefined;
    const expiresAt = Date.parse(status.lastUpdatedAt) + offlineRosterFreshnessMs;
    const timeout = setTimeout(
      () => setStatus((current) => ({ ...current, state: "outdated" })),
      Math.max(0, expiresAt - Date.now())
    );
    return () => clearTimeout(timeout);
  }, [status.lastUpdatedAt, status.state]);

  return { refresh, status };
}
