import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/features/auth";
import {
  clearLifecycleOfflineCache,
  getPendingLifecycleAttendanceCount,
} from "@/features/attendance/offline/services/offline-roster-cache";
import { archiveGroup, deleteGroup, setMyGroupArchived, updateGroup } from "../api/group-mutations";

const invalidate = (client: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.groups.all }),
    client.invalidateQueries({ queryKey: queryKeys.events.all }),
    client.invalidateQueries({ queryKey: queryKeys.attendance.all }),
  ]);
export function useUpdateGroup() {
  const client = useQueryClient();
  return useMutation({ mutationFn: updateGroup, onSuccess: () => invalidate(client) });
}
export function useArchiveGroup() {
  const client = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (user && (await getPendingLifecycleAttendanceCount(user.id, { groupId })) > 0)
        return "pending_sync" as const;
      const result = await archiveGroup(groupId);
      if (user && result === "archived") await clearLifecycleOfflineCache(user.id, { groupId });
      return result;
    },
    onSuccess: () => invalidate(client),
  });
}
export function useDeleteGroup() {
  const client = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (user && (await getPendingLifecycleAttendanceCount(user.id, { groupId })) > 0)
        return "pending_sync" as const;
      const result = await deleteGroup(groupId);
      if (user && result === "deleted") await clearLifecycleOfflineCache(user.id, { groupId });
      return result;
    },
    onSuccess: () => invalidate(client),
  });
}
export function useSetMyGroupArchived() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, archived }: { groupId: string; archived: boolean }) =>
      setMyGroupArchived(groupId, archived),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.groups.all }),
  });
}
