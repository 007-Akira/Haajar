import { useEffect, type JSX, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { sanitizeNotificationRoute } from "../config/notification-routing";
import { configureAndroidNotificationChannel } from "../services/push-notification-service";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationProvider({ children }: { children: ReactNode }): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    void configureAndroidNotificationChannel().catch(() => undefined);
  }, []);

  useEffect(() => {
    function openResponse(response: Notifications.NotificationResponse | null): void {
      const route = sanitizeNotificationRoute(response?.notification.request.content.data?.route);
      if (route) router.push(route as never);
    }
    void Notifications.getLastNotificationResponseAsync()
      .then(openResponse)
      .catch(() => undefined);
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openResponse);
    return () => responseSubscription.remove();
  }, [router]);

  return <>{children}</>;
}
