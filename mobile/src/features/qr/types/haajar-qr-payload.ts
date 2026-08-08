export type HaajarQrPayload =
  { type: "invitation"; token: string } | { type: "membership" } | { type: "unknown" };

const invitationPattern = /^haajar:\/\/join\/([a-z0-9]{24})$/i;
const membershipPattern = /^(?:hjr:[1-9][0-9]{0,8}:)?[a-f0-9]{64}$/i;

export function classifyHaajarQrPayload(rawPayload: string): HaajarQrPayload {
  const payload = rawPayload.trim();
  const invitation = invitationPattern.exec(payload);
  if (invitation?.[1]) return { type: "invitation", token: invitation[1].toLowerCase() };
  if (membershipPattern.test(payload)) return { type: "membership" };
  return { type: "unknown" };
}
