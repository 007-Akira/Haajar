import type { JSX } from "react";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { allowScreenCaptureAsync } from "expo-screen-capture";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../global.css";

import { SessionProvider } from "@/features/auth";
import { NotificationProvider } from "@/features/notifications";
import { QueryProvider } from "@/lib/query";
import { AndroidBackGuard } from "@/lib/navigation/android-back-guard";
import { colors, fontAssets } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const pathname = usePathname();

  useEffect(() => {
    const isSensitiveRoute = /\/events\/[^/]+\/groups\/[^/]+\/(?:qr|invite)$/.test(pathname);
    if (!isSensitiveRoute) {
      // Recover from a process/activity restart that occurs before the focused
      // sensitive screen has a chance to run its normal blur cleanup.
      void Promise.all([
        allowScreenCaptureAsync("haajar-membership-qr"),
        allowScreenCaptureAsync("haajar-group-invitation"),
      ]).catch(() => undefined);
    }
  }, [pathname]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.textPrimary }}>
      <HeroUINativeProvider>
        <QueryProvider>
          <SessionProvider>
            <NotificationProvider>
              <AndroidBackGuard />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="profile-setup" />
                <Stack.Screen name="auth/callback" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="events" />
                <Stack.Screen name="join" />
                <Stack.Screen name="group-requests/[requestId]" />
              </Stack>
              <StatusBar style="light" />
            </NotificationProvider>
          </SessionProvider>
        </QueryProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
