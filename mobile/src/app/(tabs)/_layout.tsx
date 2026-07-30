import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps, JSX } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";

import { colors, layout, spacing, typography } from "@/theme";

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
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.activeLine, !focused && styles.inactiveLine]} />
      <Ionicons color={color} name={name} size={layout.iconSize} />
    </View>
  );
}

export default function TabsLayout(): JSX.Element {
  return (
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
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: layout.tabBarHeight,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: layout.borderWidth,
  },
  label: {
    ...typography.badge,
  },
  iconContainer: {
    alignItems: "center",
    gap: spacing.half,
  },
  activeLine: {
    width: layout.iconSize,
    height: layout.focusedBorderWidth,
    backgroundColor: colors.accent,
  },
  inactiveLine: {
    backgroundColor: colors.transparent,
  },
});
