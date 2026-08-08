import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { JSX } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState, LoadingSkeleton, PageHeader, ScreenContainer } from "@/components";
import { colors, layout, radii, shadows, spacing, typography } from "@/theme";

import { sanitizeNotificationRoute } from "../config/notification-routing";
import { useNotificationInbox } from "../hooks/use-notification-inbox";
import type { NotificationInboxItem } from "../api/notification-queries";

export function NotificationsScreen(): JSX.Element {
  const router = useRouter();
  const inbox = useNotificationInbox();

  if (inbox.isPending) {
    return (
      <ScreenContainer
        contentContainerStyle={styles.content}
        scroll
        showGrid
        testID="notifications-loading"
      >
        <PageHeader title="Notifications" subtitle="Attendance and membership activity" />
        <LoadingSkeleton lines={8} />
      </ScreenContainer>
    );
  }

  if (inbox.isError) {
    return (
      <ScreenContainer contentContainerStyle={styles.content} showGrid testID="notifications-error">
        <PageHeader title="Notifications" subtitle="Attendance and membership activity" />
        <EmptyState
          actionLabel="Retry"
          description="Notifications could not be loaded. Check your connection and try again."
          onActionPress={() => void inbox.refetch()}
          title="Inbox unavailable"
        />
      </ScreenContainer>
    );
  }

  const notifications = inbox.data ?? [];
  return (
    <ScreenContainer
      contentContainerStyle={styles.content}
      onRefresh={() => void inbox.refetch()}
      refreshing={inbox.isRefetching}
      scroll
      showGrid
      testID="notifications-screen"
    >
      <PageHeader title="Notifications" subtitle="Attendance and membership activity" />
      <View style={styles.summary}>
        <Text style={styles.summaryCount}>{notifications.length}</Text>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>RECENT UPDATES</Text>
          <Text style={styles.summaryBody}>Pull down to check for new activity.</Text>
        </View>
      </View>
      {notifications.length === 0 ? (
        <EmptyState
          description="Roll-call alerts and membership updates will appear here."
          testID="notifications-empty"
          title="No notifications yet"
        />
      ) : (
        <View style={styles.list}>
          {notifications.map((item) => (
            <NotificationCard
              item={item}
              key={item.id}
              onOpen={(route) => router.push(route as never)}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

function NotificationCard({
  item,
  onOpen,
}: {
  item: NotificationInboxItem;
  onOpen: (route: string) => void;
}): JSX.Element {
  const safeRoute = sanitizeNotificationRoute(item.route);
  const date = new Date(item.createdAt);
  const time = Number.isNaN(date.getTime())
    ? "TIME UNAVAILABLE"
    : date.toLocaleString().toUpperCase();
  return (
    <Pressable
      accessibilityRole={safeRoute ? "button" : undefined}
      disabled={!safeRoute}
      onPress={() => safeRoute && onOpen(safeRoute)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`notification-${item.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Ionicons
            color={colors.textInverse}
            name={item.type === "roll_call_started" ? "scan-outline" : "people-outline"}
            size={layout.iconSize}
          />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.status}>{`[ ${item.deliveryStatus.toUpperCase()} ]`}</Text>
      </View>
      <Text style={styles.body}>{item.body}</Text>
      {safeRoute ? <Text style={styles.open}>OPEN UPDATE →</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing["2xl"] },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
  },
  summaryCount: { ...typography.displayMedium, color: colors.accent },
  summaryCopy: { flex: 1, gap: spacing.half },
  summaryTitle: { ...typography.technicalLabel, color: colors.textInverse },
  summaryBody: { ...typography.caption, color: colors.gridLine },
  list: { gap: spacing.md },
  card: {
    ...shadows.hardSmall,
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: layout.borderWidth,
    borderRadius: radii.sm,
  },
  cardPressed: { opacity: 0.75, transform: [{ translateX: 2 }, { translateY: 2 }] },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBox: {
    width: layout.iconButtonSize,
    height: layout.iconButtonSize,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textPrimary,
  },
  cardCopy: { flex: 1, gap: spacing.half },
  cardTitle: { ...typography.headingSmall, color: colors.textPrimary },
  time: { ...typography.technicalLabel, color: colors.textSecondary },
  status: { ...typography.badge, color: colors.accent },
  body: { ...typography.body, color: colors.textPrimary },
  open: { ...typography.button, color: colors.accent },
});
