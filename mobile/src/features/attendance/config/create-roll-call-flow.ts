import { appErrorCodes, isAppError } from "@/lib/errors";

export type CreateRollCallBlockReason = "unauthorised" | "archived" | "no_active_members";

export interface CreateRollCallAccessContext {
  membershipRole: string | null;
  membershipStatus: string | null;
  groupStatus: string | null;
  eventStatus: string | null;
  activeMemberCount: number;
}

export interface CreateRollCallAccess {
  allowed: boolean;
  reason: CreateRollCallBlockReason | null;
}

export type CreateRollCallFailure =
  "active_roll_call_exists" | "archived" | "unauthorised" | "network_error" | "backend_failure";

export function getCreateRollCallAccess(
  context: CreateRollCallAccessContext
): CreateRollCallAccess {
  if (context.groupStatus !== "active" || context.eventStatus === "archived") {
    return { allowed: false, reason: "archived" };
  }
  if (
    context.membershipStatus !== "active" ||
    !["organiser", "super_organiser"].includes(context.membershipRole ?? "")
  ) {
    return { allowed: false, reason: "unauthorised" };
  }
  if (context.activeMemberCount < 1) {
    return { allowed: false, reason: "no_active_members" };
  }
  return { allowed: true, reason: null };
}

export function normalizeRollCallTitle(value: string): string {
  return value.trim() || "Roll call";
}

export function mapCreateRollCallFailure(error: unknown): CreateRollCallFailure {
  if (!isAppError(error)) return "backend_failure";
  if (
    error.code === appErrorCodes.permissionDenied ||
    error.code === appErrorCodes.authenticationRequired
  ) {
    return "unauthorised";
  }
  if (error.code === appErrorCodes.network) return "network_error";
  if (error.code === appErrorCodes.conflict) {
    const cause = asBackendCause(error.cause);
    if (cause.code === "55000" || cause.message.includes("archived")) return "archived";
    return "active_roll_call_exists";
  }
  return "backend_failure";
}

export function createRollCallFailureMessage(failure: CreateRollCallFailure): string {
  const messages: Record<CreateRollCallFailure, string> = {
    active_roll_call_exists: "A roll call is already active for this group.",
    archived: "Archived groups or trips cannot start a roll call.",
    unauthorised: "You no longer have permission to start this roll call.",
    network_error: "Check your connection and try again.",
    backend_failure: "Haajar could not start the roll call. Please try again.",
  };
  return messages[failure];
}

export function buildRollCallDashboardRoute(eventId: string, groupId: string, rollCallId: string) {
  return {
    pathname: "/events/[eventId]/groups/[groupId]/roll-calls/[rollCallId]" as const,
    params: { eventId, groupId, rollCallId },
  };
}

function asBackendCause(value: unknown): { code: string; message: string } {
  if (!value || typeof value !== "object") return { code: "", message: "" };
  const cause = value as { code?: unknown; message?: unknown };
  return {
    code: typeof cause.code === "string" ? cause.code : "",
    message: typeof cause.message === "string" ? cause.message.toLowerCase() : "",
  };
}
