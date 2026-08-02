import { useCallback, useRef, useState } from "react";
import {
  allowScreenCaptureAsync,
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  preventScreenCaptureAsync,
} from "expo-screen-capture";
import { useFocusEffect } from "expo-router";
import { AppState, Platform } from "react-native";

export function useSensitiveScreenPrivacy(options: {
  protectionKey: string;
  onBackground?: () => void;
  onBlur?: () => void;
  onForeground?: () => void;
}): { obscured: boolean } {
  const [obscured, setObscured] = useState(AppState.currentState !== "active");
  const needsForegroundRefresh = useRef(false);
  const { onBackground, onBlur, onForeground, protectionKey } = options;

  useFocusEffect(
    useCallback(() => {
      setObscured(AppState.currentState !== "active");
      if (needsForegroundRefresh.current && AppState.currentState === "active") {
        needsForegroundRefresh.current = false;
        onForeground?.();
      }
      void preventScreenCaptureAsync(protectionKey);
      if (Platform.OS === "ios") void enableAppSwitcherProtectionAsync(1);

      const subscription = AppState.addEventListener("change", (state) => {
        const hidden = state !== "active";
        setObscured(hidden);
        if (hidden) {
          needsForegroundRefresh.current = true;
          onBackground?.();
        } else {
          needsForegroundRefresh.current = false;
          onForeground?.();
        }
      });

      return () => {
        subscription.remove();
        needsForegroundRefresh.current = true;
        setObscured(false);
        onBlur?.();
        void allowScreenCaptureAsync(protectionKey);
        if (Platform.OS === "ios") void disableAppSwitcherProtectionAsync();
      };
    }, [onBackground, onBlur, onForeground, protectionKey])
  );

  return { obscured };
}
