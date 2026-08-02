import { useCallback, useState } from "react";
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
}): { obscured: boolean } {
  const [obscured, setObscured] = useState(AppState.currentState !== "active");
  const { onBackground, onBlur, protectionKey } = options;

  useFocusEffect(
    useCallback(() => {
      setObscured(AppState.currentState !== "active");
      void preventScreenCaptureAsync(protectionKey);
      if (Platform.OS === "ios") void enableAppSwitcherProtectionAsync(1);

      const subscription = AppState.addEventListener("change", (state) => {
        const hidden = state !== "active";
        setObscured(hidden);
        if (hidden) onBackground?.();
      });

      return () => {
        subscription.remove();
        setObscured(false);
        onBlur?.();
        void allowScreenCaptureAsync(protectionKey);
        if (Platform.OS === "ios") void disableAppSwitcherProtectionAsync();
      };
    }, [onBackground, onBlur, protectionKey])
  );

  return { obscured };
}
