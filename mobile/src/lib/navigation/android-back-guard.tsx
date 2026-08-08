import { useEffect, useRef, type JSX } from "react";
import { router, usePathname } from "expo-router";
import { BackHandler, Platform, ToastAndroid } from "react-native";

import { resolveBackFallback } from "./android-back";

const EXIT_CONFIRMATION_WINDOW_MS = 2_000;

export function AndroidBackGuard(): JSX.Element | null {
  const pathname = usePathname();
  const lastRootBackAt = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      const fallback = resolveBackFallback(pathname);
      if (fallback) {
        router.replace(fallback as never);
        return true;
      }

      if (pathname !== "/") return false;

      const now = Date.now();
      if (now - lastRootBackAt.current <= EXIT_CONFIRMATION_WINDOW_MS) {
        BackHandler.exitApp();
        return true;
      }

      lastRootBackAt.current = now;
      ToastAndroid.show("Swipe back again to exit", ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, [pathname]);

  return null;
}
