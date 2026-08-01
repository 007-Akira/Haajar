# Membership QR resolution contract

`public.resolve_membership_qr(presented_token text, expected_group_id uuid)` is the only client-facing path for resolving a membership QR. The mobile data-layer wrapper is `resolveMembershipQr(presentedToken, expectedGroupId)`.

## Authorisation

The caller must be authenticated and either:

- an active `co_organiser`, `organiser`, or `super_organiser` in the expected group; or
- an active event super organiser for the expected group's event.

Authorisation and active/archived context checks happen before credential lookup. Ordinary members receive `unauthorised` with no member data. The function is `SECURITY DEFINER`, has an empty fixed `search_path`, and is executable only by `authenticated`.

## Input and canonicalisation

The resolver accepts the existing `HJR:<version>:<64 hex token>` payload or its raw 64-character token. It extracts no group, member, or role claims from the payload. The canonical lowercase token is SHA-256 hashed exactly as it is during issuance; plaintext is never stored or audited.

`expected_group_id` is trusted only as scanner context, not as a membership claim. A credential belonging to another group returns `wrong_group` without member details.

## Response

`resolution_status` is one of:

- `valid`
- `invalid`
- `revoked`
- `wrong_group`
- `inactive_membership`
- `archived`
- `unauthorised`

Only `valid` includes membership ID, member user ID, display name, phone, expected group ID/name, role, active membership status, active credential status, and credential version. All sensitive fields are null for non-valid results. Email, token, hash, encrypted token material, audit data, registration answers, and unrelated memberships are never returned.

There is currently no QR expiry column, so no expiry rule is applied. Revocation, regeneration, and role rotation make older credentials resolve as `revoked`.

## Concurrency and audit

The expected group, event, credential, and membership are held with row-share locks during resolution so a successful result cannot race a concurrent revocation. Successful and security-relevant failed attempts write an audit event containing only the resolution status. Tokens, hashes, ciphertext, and presented payloads are excluded.

This RPC only resolves identity. It does not mark attendance or create roll-call records.
