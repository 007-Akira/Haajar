import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import { listMyNotifications } from "../api/notification-queries";

export function useNotificationInbox() {
  const { loading, user } = useSession();
  return useQuery({
    queryKey: queryKeys.notifications.list(user?.id ?? "missing-user"),
    queryFn: listMyNotifications,
    enabled: !loading && Boolean(user),
  });
}
