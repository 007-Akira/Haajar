import type { QueryKey } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query";

interface AttendanceCacheContext {
  groupId: string;
  rollCallId: string;
  userId: string;
}

export function getCreateRollCallCacheTargets(groupId: string, userId: string) {
  return [
    queryKeys.attendance.activeByGroup(groupId, userId),
    queryKeys.attendance.history(groupId, userId),
    queryKeys.groups.detail(groupId, userId),
  ] as const;
}

export function getAttendanceMarkCacheTargets(
  context: AttendanceCacheContext & { membershipId: string | null; changed: boolean }
) {
  const targets: QueryKey[] = [
    queryKeys.attendance.dashboard(context.rollCallId, context.userId),
    queryKeys.attendance.rollCall(context.rollCallId, context.userId),
    queryKeys.attendance.history(context.groupId, context.userId),
  ];
  if (context.membershipId) {
    targets.push(
      queryKeys.attendance.memberState(context.rollCallId, context.membershipId, context.userId)
    );
  }
  if (context.changed) targets.push(queryKeys.groups.detail(context.groupId, context.userId));
  return targets;
}

export function getCloseRollCallCacheTargets(context: AttendanceCacheContext) {
  return [
    queryKeys.attendance.activeByGroup(context.groupId, context.userId),
    queryKeys.attendance.rollCall(context.rollCallId, context.userId),
    queryKeys.attendance.dashboard(context.rollCallId, context.userId),
    queryKeys.attendance.history(context.groupId, context.userId),
    queryKeys.groups.detail(context.groupId, context.userId),
  ] as const;
}
