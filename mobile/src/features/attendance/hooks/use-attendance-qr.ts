import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/features/auth";
import { createEphemeralSecretStore } from "../config/ephemeral-secret";
import { createClientOperationId } from "../config/client-operation-id";
import { createMutationGuard } from "../config/mutation-guard";
import { queryKeys } from "@/lib/query";
import { resolveAttendanceQr, markAttendanceRosterPresent } from "../api/attendance-qr";

export function useResolveAttendanceQr() {
  const [secret] = useState(createEphemeralSecretStore);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: async (attendanceUnitId: string) => {
      const presentedToken = secret.take();
      if (!presentedToken) throw new Error("QR scan expired.");
      return resolveAttendanceQr({ attendanceUnitId, presentedToken });
    },
    onSettled: () => secret.clear(),
  });
  useEffect(() => () => secret.clear(), [secret]);
  return {
    isPending: mutation.isPending,
    reset: mutation.reset,
    resolve: async (input: { attendanceUnitId: string; presentedToken: string }) => {
      secret.set(input.presentedToken);
      try {
        return await mutation.mutateAsync(input.attendanceUnitId);
      } finally {
        secret.clear();
      }
    },
  };
}

export function useMarkAttendanceRosterPresent(rollCallId: string) {
  const { user } = useSession();
  const client = useQueryClient();
  const [guard] = useState(createMutationGuard);
  const [secret] = useState(createEphemeralSecretStore);
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (input: { attendanceUnitId: string; rosterEntryId: string }) => {
      const presentedToken = secret.take();
      if (!presentedToken) throw new Error("QR scan expired.");
      return markAttendanceRosterPresent({
        ...input,
        presentedToken,
        clientOperationId: createClientOperationId(),
      });
    },
    onSuccess: async () => {
      if (user)
        await client.invalidateQueries({
          queryKey: queryKeys.attendance.dashboard(rollCallId, user.id),
          exact: true,
        });
    },
    onSettled: () => secret.clear(),
  });
  useEffect(() => () => secret.clear(), [secret]);
  return {
    ...mutation,
    mark: async (input: {
      attendanceUnitId: string;
      rosterEntryId: string;
      presentedToken: string;
    }) => {
      if (!guard.tryStart()) throw new Error("Attendance marking already in progress.");
      secret.set(input.presentedToken);
      try {
        return await mutation.mutateAsync({
          attendanceUnitId: input.attendanceUnitId,
          rosterEntryId: input.rosterEntryId,
        });
      } finally {
        secret.clear();
        guard.finish();
      }
    },
  };
}
