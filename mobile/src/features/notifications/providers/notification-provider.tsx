import { useEffect, type JSX, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { useSession } from "@/features/auth";

import { sanitizeNotificationRoute } from "../config/notification-routing";
import {
  configureAndroidNotificationChannel,
  getPushPermissionState,
  registerCurrentExpoPushToken,
} from "../services/push-notification-service";

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
  const { profile, user } = useSession();

  useEffect(() => {
    void configureAndroidNotificationChannel();
  }, []);

  useEffect(() => {
    if (!user || !profile?.profile_completed) return undefined;
    void getPushPermissionState().then((state) => {
      if (state === "enabled") void registerCurrentExpoPushToken();
    });
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      void registerCurrentExpoPushToken();
    });
    return () => tokenSubscription.remove();
  }, [profile?.profile_completed, user]);

  useEffect(() => {
    function openResponse(response: Notifications.NotificationResponse | null): void {
      const route = sanitizeNotificationRoute(response?.notification.request.content.data?.route);
      if (route) router.push(route as never);
    }
    void Notifications.getLastNotificationResponseAsync().then(openResponse);
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(openResponse);
    return () => responseSubscription.remove();
  }, [router]);

  return <>{children}</>;
}
