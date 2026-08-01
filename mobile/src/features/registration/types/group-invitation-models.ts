import type { CreatedGroupInvitation } from "../api/registration-mutations";
import { isAppError, userSafeErrorMessages } from "@/lib/errors";

export type InvitationManagerRole = "member" | "co_organiser" | "organiser" | "super_organiser";

export interface GeneratedGroupInvitation extends CreatedGroupInvitation {
  deepLink: string;
}

export interface EphemeralInvitationStore {
  get: () => GeneratedGroupInvitation | null;
  set: (invitation: GeneratedGroupInvitation) => void;
  clear: () => void;
}

export function canCreateGroupInvitation(
  role: string | undefined,
  membershipStatus: string | undefined,
  groupStatus: string | undefined
): boolean {
  return (
    membershipStatus === "active" &&
    groupStatus === "active" &&
    (role === "organiser" || role === "super_organiser")
  );
}

export function buildInvitationDeepLink(token: string): string {
  return `haajar://join/${token}`;
}

export function buildInvitationShareMessage(groupName: string, deepLink: string): string {
  return `Join ${groupName} on Haajar:\n${deepLink}`;
}

export function safeInvitationErrorMessage(error: unknown): string {
  return isAppError(error) ? error.message : userSafeErrorMessages.UNKNOWN_ERROR;
}

export function createEphemeralInvitationStore(): EphemeralInvitationStore {
  let value: GeneratedGroupInvitation | null = null;
  return {
    get: () => value,
    set: (invitation) => {
      value = invitation;
    },
    clear: () => {
      value = null;
    },
  };
}

export async function requestGroupInvitation(
  groupId: string,
  generator: (groupId: string) => Promise<CreatedGroupInvitation>
): Promise<GeneratedGroupInvitation> {
  const result = await generator(groupId);
  return { ...result, deepLink: buildInvitationDeepLink(result.invitationToken) };
}
