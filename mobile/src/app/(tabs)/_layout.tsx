import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, type ComponentProps, type JSX } from "react";
import { StyleSheet, type ColorValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, layout, typography } from "@/theme";
import { ProtectedRoute } from "@/features/auth";
import { ProfileCompletionGuard } from "@/features/profile";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  color,
  focused,
}: {
  name: IoniconName;
  color: ColorValue;
  focused: boolean;
}): JSX.Element {
  const selectionProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    selectionProgress.value = withTiming(focused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused, selectionProgress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + selectionProgress.value * 0.08 }],
  }));
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: selectionProgress.value }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, iconStyle]}>
      <Ionicons color={color} name={name} size={layout.iconSize} />
      <Animated.View style={[styles.selectionLine, lineStyle]} />
    </Animated.View>
  );
}

export default function TabsLayout(): JSX.Element {
  return (
    <ProtectedRoute>
      <ProfileCompletionGuard>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: styles.label,
            tabBarStyle: styles.tabBar,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color={color} focused={focused} name="home-outline" />
              ),
              tabBarButtonTestID: "home-tab",
            }}
          />
          <Tabs.Screen
            name="groups"
            options={{
              title: "Groups",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color={color} focused={focused} name="people-outline" />
              ),
              tabBarButtonTestID: "groups-tab",
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              title: "Notifications",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color={color} focused={focused} name="notifications-outline" />
              ),
              tabBarButtonTestID: "notifications-tab",
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon color={color} focused={focused} name="person-outline" />
              ),
              tabBarButtonTestID: "profile-tab",
            }}
          />
        </Tabs>
      </ProfileCompletionGuard>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: layout.tabBarHeight,
    backgroundColor: colors.surface,
    borderTopColor: colors.borderStrong,
    borderTopWidth: layout.focusedBorderWidth,
    paddingTop: 0,
  },
  label: {
    ...typography.badge,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    minHeight: 34,
    position: "relative",
  },
  selectionLine: {
    position: "absolute",
    right: 8,
    bottom: -24,
    left: 8,
    height: layout.focusedBorderWidth,
    backgroundColor: colors.accent,
  },
});
