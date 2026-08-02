import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import {
  subscribeToAttendanceChanges,
  type AttendanceRealtimeSubscription,
} from "../api/attendance-realtime";
import {
  createInvalidationScheduler,
  type AttendanceRealtimeState,
} from "../config/attendance-realtime";

export function useAttendanceRealtime(rollCallId?: string, enabled = true) {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<AttendanceRealtimeSubscription | null>(null);
  const [state, setState] = useState<AttendanceRealtimeState>("idle");

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !rollCallId || !userId || subscriptionRef.current) return undefined;

      let previousState: AttendanceRealtimeState = "idle";
      let acceptingUpdates = true;
      const queryKey = queryKeys.attendance.dashboard(rollCallId, userId);
      const scheduler = createInvalidationScheduler(() => {
        void queryClient.invalidateQueries({ queryKey, exact: true });
      });
      const subscription = subscribeToAttendanceChanges({
        rollCallId,
        userId,
        onChange: scheduler.schedule,
        onStateChange: (nextState) => {
          if (!acceptingUpdates) return;
          if (nextState === "live" && previousState === "degraded") scheduler.schedule();
          previousState = nextState;
          setState(nextState);
        },
      });
      subscriptionRef.current = subscription;

      return () => {
        acceptingUpdates = false;
        scheduler.clear();
        subscriptionRef.current = null;
        void subscription.unsubscribe();
      };
    }, [enabled, queryClient, rollCallId, userId])
  );

  return state;
}
