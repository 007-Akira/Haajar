import { throwSupabaseError } from "@/lib/errors";
import { getSupabaseClient } from "@/lib/supabase";

export interface NotificationInboxItem {
  id: string;
  type: string;
  title: string;
  body: string;
  route: string;
  deliveryStatus: string;
  createdAt: string;
}

export async function listMyNotifications(): Promise<NotificationInboxItem[]> {
  const { data, error } = await getSupabaseClient().rpc("list_my_notifications", {
    notification_limit: 50,
  });
  if (error) throwSupabaseError(error, "listMyNotifications");
  return data.map((row) => ({
    id: row.notification_id,
    type: row.notification_type,
    title: row.title,
    body: row.body,
    route: row.route,
    deliveryStatus: row.delivery_status,
    createdAt: row.created_at,
  }));
}
