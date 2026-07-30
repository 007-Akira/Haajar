# Security Model

## Threat model

Relevant risks:

- Forged or guessed QR tokens
- QR screenshot sharing
- Unauthorised role changes
- Unauthorised manual attendance
- Duplicate or replayed attendance requests
- Service-role key exposure
- Users reading unrelated groups
- Offline record manipulation
- Stale local rosters
- Notification abuse
- Export leakage
- Audit-log deletion

## Authentication

- Use Supabase Auth with Google browser OAuth.
- Use PKCE where supported by the mobile OAuth flow.
- Allow only verified Google identities.
- Store auth sessions using secure platform storage.
- Never store refresh tokens in plain AsyncStorage.

## Authorisation

All role checks must be derived from active memberships.

Never trust:

- Role values supplied by the client
- Group IDs without membership validation
- UI-hidden controls as security
- QR data beyond the opaque token

## Row Level Security

Enable RLS on every exposed table.

### Profiles

Users may:

- Read their own profile
- Update their own name and phone
- Read profiles of users sharing an active group, when required

### Groups

Users may read:

- Groups they actively belong to
- Public invitation metadata required for joining

Organisers may update only managed groups.

### Memberships

Members may read memberships in shared groups.

Only authorised organisers may approve, deactivate, or change roles.

### Attendance

Members may read their own attendance.

Organisers may read attendance for managed groups.

Super organisers may read event-wide attendance.

Attendance mutations should use secured RPC functions.

## QR security

- Generate at least 128 bits of cryptographically secure randomness.
- Store only a hash of the QR token on the server.
- Compare token hashes during resolution.
- Revoke old credentials on role changes.
- Rate-limit invalid QR attempts.
- Never encode personal details directly.
- Include a token version prefix for future migration.

## Attendance integrity

- Unique `(roll_call_id, membership_id)` constraint
- Unique `client_record_id`
- Server timestamps
- Device timestamps stored separately
- Actor identity stored for every mutation
- Manual corrections logged
- Idempotent RPC function

## Offline security

Offline attendance is a trusted-organiser fallback, not high-assurance identity verification.

Mitigations:

- Cache only authorised groups.
- Encrypt sensitive local data where feasible.
- Mark cached rosters with version and expiry.
- Warn when the roster is outdated.
- Record device time and server sync time.
- Preserve the actor and device ID.
- Require online revalidation before high-risk administrative actions.
- Do not allow offline role changes or join approvals.

## Secret management

Never include in the app:

- Supabase service-role key
- Expo access tokens
- Google OAuth client secret
- Database password

The mobile app may contain only the public Supabase URL and anon key, protected by RLS.

## Push notification security

- Send notifications server-side.
- Validate event and group permissions before dispatch.
- Do not allow clients to provide arbitrary recipient tokens.
- Avoid sensitive personal details in lock-screen notification bodies.

## Export security

- Only organisers and super organisers may export.
- Exports should be generated on demand.
- Do not create permanent public download URLs.
- Warn users that CSV files contain personal information.
- Log export actions.

## Logging

Audit logs should be append-only for normal users.

Record:

- Role changes
- QR regeneration
- Join decisions
- Registration-answer corrections
- Attendance corrections
- Group archival
- Export actions
- Sync conflicts

## Rate limiting

Apply rate limits to:

- QR resolution
- Join-code attempts
- Notification-triggering operations
- Repeated OAuth callbacks
- Export generation
