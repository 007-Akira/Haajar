# Offline Cache and Synchronisation

## Operating model

Haajar is online-first with offline fallback.

The normal path is:

```text
Local cache lookup
→ Immediate UI response
→ Local write
→ Background Supabase write
→ Server confirmation
→ Local synced state
```

## Local SQLite tables

- `cached_events`
- `cached_groups`
- `cached_memberships`
- `cached_registration_answers`
- `cached_qr_credentials`
- `local_roll_calls`
- `local_attendance`
- `sync_queue`
- `sync_batches`
- `sync_metadata`
- `app_settings`

## Roster caching

Before a roll call, cache:

- Group metadata
- Active memberships
- QR token hashes or safe local lookup keys
- Names
- Phone numbers
- Roles
- Registration answers
- Roster version
- Download time

## Local attendance write

Every confirmed scan is first written locally.

Required fields:

```text
client_record_id
local_roll_call_id
membership_id
status
marked_at_device
marked_by
method
sync_status
attempt_count
last_error
```

## Sync states

- pending
- syncing
- synced
- failed_retryable
- failed_permanent
- conflict_resolved

## Queue rules

1. Preserve FIFO order within one roll call.
2. Process batches, not one unbounded request.
3. Retry with exponential backoff.
4. Do not delete a record before server confirmation.
5. One bad record must not block the rest.
6. Use `client_record_id` for idempotency.
7. Stop aggressive retries on poor connectivity.

## Connectivity detection

Use NetInfo, but verify internet access through actual requests.

A connected Wi-Fi network may still have no usable internet.

## Conflict rules

For duplicate present records:

- Keep one final row.
- Preserve earliest valid marking time.
- Log additional attempts.

For manual corrections:

- Latest authorised manual correction determines final status.
- Preserve all previous values in audit logs.

For stale roster membership:

- Reject attendance if membership was revoked before server sync.
- Return a clear permanent failure.
- Keep the local record visible for organiser review.

## One-device offline rule

Only one designated organiser device should collect attendance for one group while offline.

This is an operational rule for the MVP. A formal device lease can be added later.

## Roster freshness

Show:

```text
Last updated
Roster version
Member count
Offline-ready status
```

Warn when:

- Roster is older than a configured threshold.
- Membership changes are pending.
- The device has never downloaded the roster.

## App restart recovery

On launch:

1. Open SQLite.
2. Recover pending batches.
3. Reconcile records marked `syncing`.
4. Check connectivity.
5. Retry eligible records.
6. Show pending count to the user.
