import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme";
import {
  getForegroundAttendanceAlert,
  subscribeToAttendanceStarts,
  type ForegroundAttendanceAlert,
} from "../api/foreground-attendance-alerts";
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
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [alert, setAlert] = useState<ForegroundAttendanceAlert | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (!user?.id) return undefined;
    const subscription = subscribeToAttendanceStarts({
      userId: user.id,
      onStart: (sessionId) => {
        void getForegroundAttendanceAlert(sessionId)
          .then(async (nextAlert) => {
            const route = sanitizeNotificationRoute(nextAlert.route);
            if (!route) return;
            setAlert({ ...nextAlert, route });
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
            dismissTimer.current = setTimeout(() => setAlert(null), 12000);
            if (nextAlert.groupId) {
              await queryClient.invalidateQueries({
                queryKey: queryKeys.attendance.activeByGroup(nextAlert.groupId, user.id),
              });
            }
            if (AppState.currentState === "active") {
              const permission = await Notifications.getPermissionsAsync();
              if (permission.granted)
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Attendance started",
                    body: `${nextAlert.scopeName} — Open Attendance`,
                    data: { route },
                  },
                  trigger: null,
                });
            }
          })
          .catch(() => undefined);
      },
    });
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      void subscription.unsubscribe();
    };
  }, [queryClient, user?.id]);

  return (
    <View style={styles.root}>
      {children}
      {alert ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Attendance started for ${alert.scopeName}. Open Attendance`}
          onPress={() => {
            setAlert(null);
            router.push(alert.route as never);
          }}
          style={styles.banner}
          testID="foreground-attendance-banner"
        >
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>ATTENDANCE STARTED</Text>
            <Text style={styles.bannerBody}>{`${alert.scopeName} — Open Attendance`}</Text>
          </View>
          <Text style={styles.openLabel}>OPEN</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    position: "absolute",
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.textPrimary,
    borderColor: colors.accent,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
    ...shadows.hardMedium,
  },
  bannerCopy: { flex: 1, gap: spacing.half },
  bannerTitle: { ...typography.technicalLabel, color: colors.accent },
  bannerBody: { ...typography.bodyMedium, color: colors.textInverse },
  openLabel: { ...typography.technicalLabel, color: colors.textInverse },
});
