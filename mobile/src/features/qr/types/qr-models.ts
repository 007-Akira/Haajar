import { AppError, appErrorCodes, userSafeErrorMessages } from "@/lib/errors";
import type { Database } from "@/types/database.types";

export interface MembershipQr {
  membershipId: string;
  credentialId: string;
  token: string;
  version: number;
  receivedAt: string;
}

export interface QrCredentialMutationResult {
  credentialId: string;
  token: string;
  version: number;
}

export type MembershipQrResolutionStatus =
  | "valid"
  | "invalid"
  | "revoked"
  | "wrong_group"
  | "inactive_membership"
  | "archived"
  | "unauthorised";

export type MembershipQrResolution =
  | {
      status: "valid";
      membershipId: string;
      memberUserId: string;
      displayName: string;
      phone: string | null;
      groupId: string;
      groupName: string;
      role: "member" | "co_organiser" | "organiser" | "super_organiser";
      membershipStatus: "active";
      credentialStatus: "active";
      credentialVersion: number;
    }
  | { status: Exclude<MembershipQrResolutionStatus, "valid"> };

export const redactedQrToken = "[REDACTED_QR_TOKEN]";

type QrRpcRow = Database["public"]["Functions"]["regenerate_membership_qr"]["Returns"][number];
type ResolveQrRpcRow = Database["public"]["Functions"]["resolve_membership_qr"]["Returns"][number];

const resolutionStatuses = new Set<MembershipQrResolutionStatus>([
  "valid",
  "invalid",
  "revoked",
  "wrong_group",
  "inactive_membership",
  "archived",
  "unauthorised",
]);
const membershipRoles = new Set(["member", "co_organiser", "organiser", "super_organiser"]);

export function mapMembershipQrResolution(row: ResolveQrRpcRow): MembershipQrResolution {
  if (!resolutionStatuses.has(row.resolution_status as MembershipQrResolutionStatus)) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  const status = row.resolution_status as MembershipQrResolutionStatus;
  if (status !== "valid") return { status };
  if (
    !row.membership_id ||
    !row.member_user_id ||
    !row.display_name ||
    !row.group_id ||
    !row.group_name ||
    !row.member_role ||
    !membershipRoles.has(row.member_role) ||
    row.membership_status !== "active" ||
    row.credential_status !== "active" ||
    row.credential_version === null
  ) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return {
    status,
    membershipId: row.membership_id,
    memberUserId: row.member_user_id,
    displayName: row.display_name,
    phone: row.phone,
    groupId: row.group_id,
    groupName: row.group_name,
    role: row.member_role as Extract<MembershipQrResolution, { status: "valid" }>["role"],
    membershipStatus: "active",
    credentialStatus: "active",
    credentialVersion: row.credential_version,
  };
}

export function buildMembershipQrPayload(version: number, token: string): string {
  if (!Number.isInteger(version) || version < 1 || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new AppError({
      code: appErrorCodes.validation,
      message: userSafeErrorMessages[appErrorCodes.validation],
    });
  }
  return `HJR:${version}:${token}`;
}

export function mapQrCredentialResult(row: QrRpcRow): QrCredentialMutationResult {
  if (!row.qr_credential_id || !row.qr_token || row.qr_version === null) {
    throw new AppError({
      code: appErrorCodes.database,
      message: userSafeErrorMessages[appErrorCodes.database],
      retryable: true,
    });
  }
  return {
    credentialId: row.qr_credential_id,
    token: row.qr_token,
    version: row.qr_version,
  };
}

export function redactQrToken<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/hjr:[1-9][0-9]{0,8}:[a-f0-9]{64}/gi, redactedQrToken)
      .replace(/\b[a-f0-9]{64}\b/gi, redactedQrToken) as T;
  }
  if (Array.isArray(value)) return value.map((item) => redactQrToken(item)) as T;
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === "qr_token" || key === "qrToken" || key === "token"
        ? redactedQrToken
        : redactQrToken(child),
    ])
  ) as T;
}
