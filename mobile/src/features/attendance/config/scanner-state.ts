import type { MembershipQrResolutionStatus } from "@/features/qr/types/qr-models";
import type { AttendanceQrResolutionStatus } from "../types/attendance-contracts";

export type ScannerPhase = "ready" | "resolving" | "verifying" | "marking" | "result";

export interface ScannerGate {
  tryAcquire(): boolean;
  pause(): void;
  resume(): void;
  clear(): void;
  readonly paused: boolean;
}

export function createScannerGate(
  debounceMilliseconds = 1500,
  now: () => number = Date.now
): ScannerGate {
  let isPaused = false;
  let lastAcceptedAt = Number.NEGATIVE_INFINITY;
  return {
    tryAcquire(): boolean {
      const timestamp = now();
      if (isPaused || timestamp - lastAcceptedAt < debounceMilliseconds) return false;
      isPaused = true;
      lastAcceptedAt = timestamp;
      return true;
    },
    pause(): void {
      isPaused = true;
    },
    resume(): void {
      isPaused = false;
    },
    clear(): void {
      isPaused = true;
      lastAcceptedAt = Number.NEGATIVE_INFINITY;
    },
    get paused(): boolean {
      return isPaused;
    },
  };
}

export interface ScannerResultCopy {
  tone: "success" | "warning" | "error";
  title: string;
  message: string;
}

export function getResolutionResultCopy(
  status:
    Exclude<MembershipQrResolutionStatus, "valid"> | Exclude<AttendanceQrResolutionStatus, "valid">
): ScannerResultCopy {
  const results: Record<string, ScannerResultCopy> = {
    invalid: {
      tone: "error",
      title: "Invalid ticket",
      message: "This is not a valid Haajar membership ticket.",
    },
    invalid_qr: {
      tone: "error",
      title: "Invalid ticket",
      message: "This is not a valid Haajar membership ticket.",
    },
    revoked: {
      tone: "error",
      title: "Ticket revoked",
      message: "This membership ticket has been replaced or revoked.",
    },
    wrong_group: {
      tone: "error",
      title: "Wrong group",
      message: "This ticket belongs to another group and cannot be used here.",
    },
    wrong_unit: {
      tone: "error",
      title: "Wrong attendance unit",
      message: "This ticket cannot be used for the current attendance unit.",
    },
    not_in_roster: {
      tone: "error",
      title: "Not in roster",
      message: "This member was not included in the attendance roster snapshot.",
    },
    closed_unit: {
      tone: "error",
      title: "Attendance closed",
      message: "This attendance unit is no longer accepting marks.",
    },
    inactive_membership: {
      tone: "error",
      title: "Inactive membership",
      message: "This member is no longer active in the current group.",
    },
    archived: {
      tone: "error",
      title: "Attendance unavailable",
      message: "The trip or group has been archived.",
    },
    unauthorised: {
      tone: "error",
      title: "Scanner access required",
      message: "You no longer have permission to scan tickets for this group.",
    },
  };
  return results[status];
}
