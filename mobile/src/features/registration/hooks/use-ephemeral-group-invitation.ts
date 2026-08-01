import { useCallback, useRef, useState } from "react";

import { createGroupInvitation } from "../api/registration-mutations";
import {
  type GeneratedGroupInvitation,
  requestGroupInvitation,
  safeInvitationErrorMessage,
} from "../types/group-invitation-models";

export function useEphemeralGroupInvitation(groupId: string, sessionUserId?: string) {
  const [ephemeral, setEphemeral] = useState<{
    ownerId: string | undefined;
    invitation: GeneratedGroupInvitation;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generatingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clear = useCallback(() => {
    setEphemeral(null);
    setErrorMessage(null);
  }, []);

  const generate = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    clear();
    setIsGenerating(true);
    try {
      const generated = await requestGroupInvitation(groupId, createGroupInvitation);
      setEphemeral({ ownerId: sessionUserId, invitation: generated });
    } catch (error) {
      setErrorMessage(safeInvitationErrorMessage(error));
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [clear, groupId, sessionUserId]);

  const invitation = ephemeral && ephemeral.ownerId === sessionUserId ? ephemeral.invitation : null;
  return { invitation, isGenerating, errorMessage, generate, clear };
}
