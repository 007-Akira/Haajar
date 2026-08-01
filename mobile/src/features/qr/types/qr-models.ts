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

export const redactedQrToken = "[REDACTED_QR_TOKEN]";

type QrRpcRow = Database["public"]["Functions"]["regenerate_membership_qr"]["Returns"][number];

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
