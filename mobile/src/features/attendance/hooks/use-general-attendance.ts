import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { useSession } from "@/features/auth";
import { queryKeys } from "@/lib/query";

import {
  createGeneralAttendance,
  getActiveGeneralAttendance,
  listGeneralOperators,
  setGeneralOperator,
  type GeneralOperatorInput,
} from "../api/general-attendance";

const missing = "missing-scope";

export function useActiveGeneralAttendance(eventId?: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.attendance.activeGeneral(eventId ?? missing, user?.id ?? missing),
    queryFn: () => getActiveGeneralAttendance(eventId!),
    enabled: Boolean(eventId && user),
  });
}

export function useGeneralOperators(sessionId?: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.attendance.generalOperators(sessionId ?? missing, user?.id ?? missing),
    queryFn: () => listGeneralOperators(sessionId!),
    enabled: Boolean(sessionId && user),
  });
}

export function useCreateGeneralAttendance(eventId: string) {
  const { user } = useSession();
  const client = useQueryClient();
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: (input: { title: string; operators: GeneralOperatorInput[] }) =>
      createGeneralAttendance({ eventId, ...input }),
    onSuccess: async () => {
      if (!user) return;
      await client.invalidateQueries({
        queryKey: queryKeys.attendance.activeGeneral(eventId, user.id),
      });
    },
  });
  return {
    ...mutation,
    create: async (input: { title: string; operators: GeneralOperatorInput[] }) => {
      if (submitting.current) throw new Error("Attendance is already being started.");
      submitting.current = true;
      try {
        return await mutation.mutateAsync(input);
      } finally {
        submitting.current = false;
      }
    },
  };
}

export function useSetGeneralOperator(sessionId: string) {
  const { user } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (operator: GeneralOperatorInput) => setGeneralOperator({ sessionId, operator }),
    onSuccess: async () => {
      if (!user) return;
      await client.invalidateQueries({
        queryKey: queryKeys.attendance.generalOperators(sessionId, user.id),
      });
      await client.invalidateQueries({
        queryKey: queryKeys.attendance.dashboard(sessionId, user.id),
      });
    },
  });
}
