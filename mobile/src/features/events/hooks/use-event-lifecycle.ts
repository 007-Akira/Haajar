import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { useSession } from "@/features/auth";
import {
  clearLifecycleOfflineCache,
  getPendingLifecycleAttendanceCount,
} from "@/features/attendance/offline/services/offline-roster-cache";
import { archiveEvent, deleteEvent, updateEvent } from "../api/event-mutations";

export function useUpdateEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}
export function useArchiveEvent() {
  const client = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (user && (await getPendingLifecycleAttendanceCount(user.id, { eventId })) > 0)
        return "pending_sync" as const;
      const result = await archiveEvent(eventId);
      if (user && result === "archived") await clearLifecycleOfflineCache(user.id, { eventId });
      return result;
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.events.all }),
        client.invalidateQueries({ queryKey: queryKeys.groups.all }),
        client.invalidateQueries({ queryKey: queryKeys.attendance.all }),
      ]),
  });
}
export function useDeleteEvent() {
  const client = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (user && (await getPendingLifecycleAttendanceCount(user.id, { eventId })) > 0)
        return "pending_sync" as const;
      const result = await deleteEvent(eventId);
      if (user && result === "deleted") await clearLifecycleOfflineCache(user.id, { eventId });
      return result;
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.events.all }),
        client.invalidateQueries({ queryKey: queryKeys.groups.all }),
      ]),
  });
}
