# Roll-call and attendance RPC contracts

This milestone implements online attendance only. Mobile clients may read rows allowed by RLS, but
all roll-call and attendance writes must use the secured RPCs below. Clients must never persist or
log a presented QR token.

## Data model

- `roll_calls` stores the active/closed lifecycle and group/event identity.
- `roll_call_roster_members` freezes active group memberships when a roll call starts. Later role or
  membership changes do not rewrite historical totals.
- `attendance_records` stores one `present` record per frozen roster member. Absence is derived as a
  closed roster member without a present record.

The current product starts roll calls immediately, so drafts and a separate `start_roll_call` RPC
are intentionally not included. Cancellation and offline marking are also outside this milestone.

## Public RPCs

### `create_roll_call(uuid, text, text) -> uuid`

Arguments: `target_group_id`, `roll_call_title`, optional `roll_call_note`.

Requires an active organiser/super-organiser or event super-organiser. It rejects archived
groups/events and a second active roll call, creates an active roll call, freezes the active roster,
and audits creation atomically.

### `get_active_roll_call(uuid) -> setof record`

Argument: `target_group_id`.

Active group participants receive the active roll-call identity, title, status and start time.
Attendance operators additionally receive creator, total, present and remaining counts. Permission
booleans tell the UI whether the caller may scan or manage.

### `mark_attendance_present(uuid, text, text, uuid) -> setof record`

Arguments: `target_roll_call_id`, `presented_token`, `marking_method` (must be `qr`), and a required
`client_operation_id`.

Only an active co-organiser/organiser/super-organiser or event super-organiser may call it. The RPC
derives the expected group from the roll call, resolves the QR server-side, revalidates active
membership and frozen-roster membership, then inserts at most one record. Expected result statuses
include `marked_present`, `already_marked`, `closed`, `archived`, `invalid`, `revoked`,
`wrong_group`, `inactive_membership`, `not_rostered`, and `unauthorised`. It never returns or audits
the QR token.

### `mark_attendance_manual(uuid, uuid, uuid) -> setof record`

Arguments: `target_roll_call_id`, `target_membership_id`, and `client_operation_id`.

Only an organiser/super-organiser or event super-organiser may mark manually. Caller-supplied
membership identity is accepted only after the RPC verifies the roll-call group, frozen roster and
current active membership. Duplicate calls return `already_marked`.

### `close_roll_call(uuid) -> setof record`

Argument: `target_roll_call_id`.

Only a group manager may close. Closure locks the row, is idempotent, audits the first transition,
and returns the frozen roster total, present count, derived remaining/absent count and close time.
Normal attendance marking is rejected after closure.

### `get_roll_call_dashboard(uuid) -> jsonb`

Argument: `target_roll_call_id`.

Attendance operators receive metadata, frozen counts, minimal profile summaries, present members,
remaining members and permission flags. Ordinary active members receive only their own roster entry
and attendance state; aggregate counts and other member data are omitted. Unrelated users receive a
permission error.

## Idempotency and concurrency

`attendance_records` has both a unique roll-call/membership constraint and a unique client-operation
constraint. The marking RPC locks the roll call and uses conflict-safe insertion, so simultaneous
scans create one record. The same client operation may be safely retried for the same member.

## Hosted deployment

Apply migrations `20260802000900_roll_call_attendance_schema.sql` and
`20260802001000_roll_call_attendance_functions.sql`, then regenerate hosted types:

```bash
supabase gen types typescript \
  --project-id idhxgezjoxgbfjckngzp \
  --schema public \
  > mobile/src/types/database.types.ts
```

Compare the regenerated output with the checked-in forward schema types before integrating mobile
queries.
