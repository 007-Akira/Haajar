import { appErrorCodes, isAppError, mapSupabaseError } from "@/lib/errors";

import type { CanonicalAttendanceOutcome } from "../types/attendance-contracts";

const qrPayloadPattern = /hjr:[1-9][0-9]{0,8}:[a-f0-9]{64}/gi;
const rawQrTokenPattern = /\b[a-f0-9]{64}\b/gi;
export const redactedAttendanceToken = "[REDACTED_ATTENDANCE_TOKEN]";

export function redactAttendanceValue<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(qrPayloadPattern, redactedAttendanceToken)
      .replace(rawQrTokenPattern, redactedAttendanceToken) as T;
  }
  if (Array.isArray(value)) return value.map((item) => redactAttendanceValue(item)) as T;
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      /token|payload/i.test(key) ? redactedAttendanceToken : redactAttendanceValue(child),
    ])
  ) as T;
}

export function throwAttendanceSupabaseError(error: unknown, operation: string): never {
  throw mapSupabaseError(redactAttendanceValue(error), operation);
}

export function mapAttendanceErrorOutcome(
  error: unknown
): Extract<CanonicalAttendanceOutcome, "unauthorised" | "network_error"> | null {
  if (!isAppError(error)) return null;
  if (
    error.code === appErrorCodes.permissionDenied ||
    error.code === appErrorCodes.authenticationRequired
  ) {
    return "unauthorised";
  }
  return error.code === appErrorCodes.network ? "network_error" : null;
}
