import type { JSX } from "react";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "../global.css";

import { SessionProvider } from "@/features/auth";
import { QueryProvider } from "@/lib/query";
import { fontAssets } from "@/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <QueryProvider>
          <SessionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="profile-setup" />
              <Stack.Screen name="auth/callback" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="events" />
              <Stack.Screen name="join" />
              <Stack.Screen name="group-requests" />
            </Stack>
            <StatusBar style="auto" />
          </SessionProvider>
        </QueryProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
