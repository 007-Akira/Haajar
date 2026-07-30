# Backend and API Design

## Architecture

```text
React Native App
├── Supabase Auth
├── Supabase REST/Realtime
├── PostgreSQL RPC functions
├── Supabase Edge Functions
└── Expo Push Service
```

Direct table writes should be limited. Sensitive operations should use database functions.

## Recommended RPC functions

### create_event

Validates the authenticated user and creates the event with super-organiser membership.

### create_group

Creates a group, join token, organiser membership, and draft registration form.

### publish_registration_form

Validates the form and permanently locks its structure.

### submit_join_request

Creates a pending request and stores registration answers atomically.

### review_join_request

Accepts or rejects a request. On acceptance:

- Activates membership
- Issues QR credential
- Writes audit log
- Queues notification

### change_membership_role

Validates actor permissions, changes role, revokes existing QR, issues a new QR, and writes audit history.

### resolve_membership_qr

Input:

```text
QR token
Group ID
Roll-call ID
```

Returns only the fields the scanner is authorised to see.

### mark_attendance

Input:

```text
client_record_id
roll_call_id
membership_id
status
device timestamp
method
```

Requirements:

- Idempotent
- Permission checked
- Duplicate safe
- Audit logged where needed
- Returns final server state

### create_central_roll_call

Creates the parent roll call and linked group roll calls in one transaction.

### close_roll_call

Closes the roll call and converts remaining eligible unmarked memberships to absent.

### sync_offline_batch

Accepts a batch of local roll calls and attendance rows.

Returns per-record results:

- inserted
- already_exists
- conflict_resolved
- rejected
- retryable_error

## Edge Functions

Use Edge Functions for:

- Sending push notifications
- Creating CSV exports if app-side generation becomes slow
- Administrative maintenance
- Secure integration with third-party services

## Realtime

Subscribe organisers to:

- Active roll-call records
- Attendance changes for managed groups
- Central roll-call group status
- Join-request counts

Do not subscribe ordinary members to event-wide attendance.
