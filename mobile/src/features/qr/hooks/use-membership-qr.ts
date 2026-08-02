import { useCallback, useEffect, useRef, useState } from "react";

import { useSession } from "@/features/auth";

import { getMembershipQr } from "../api/qr-queries";
import type { MembershipQr } from "../types/qr-models";

export function useMembershipQr(membershipId?: string, active = true) {
  const { loading, user } = useSession();
  const [data, setData] = useState<MembershipQr>();
  const [error, setError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState(false);
  const requestSequence = useRef(0);
  const enabled = !loading && active && Boolean(membershipId && user?.id);

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestSequence.current;
    setData(undefined);
    setError(undefined);
    if (!enabled || !membershipId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const credential = await getMembershipQr(membershipId);
      if (requestId === requestSequence.current) setData(credential);
    } catch (cause) {
      if (requestId === requestSequence.current) setError(cause);
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [enabled, membershipId]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(task);
      requestSequence.current += 1;
    };
  }, [load]);

  const clear = useCallback(() => {
    requestSequence.current += 1;
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
  }, []);

  return {
    clear,
    data,
    error,
    isError: error !== undefined,
    isLoading,
    refetch: load,
  };
}
