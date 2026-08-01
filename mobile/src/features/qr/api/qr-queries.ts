import type { MembershipQr, QrCredentialMutationResult } from "../types/qr-models";

export const membershipQrIsEphemeral = true;

export function toMembershipQr(
  membershipId: string,
  result: QrCredentialMutationResult,
  receivedAt = new Date().toISOString()
): MembershipQr {
  return {
    membershipId,
    credentialId: result.credentialId,
    token: result.token,
    version: result.version,
    receivedAt,
  };
}
