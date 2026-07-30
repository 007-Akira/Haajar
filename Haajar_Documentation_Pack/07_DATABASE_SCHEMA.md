# Database Schema

## Core tables

### profiles

```text
id uuid primary key references auth.users
full_name text not null
email text not null
phone text not null
created_at timestamptz
updated_at timestamptz
```

### events

```text
id uuid primary key
name text not null
description text
created_by uuid references profiles
status text check active/archived
created_at timestamptz
updated_at timestamptz
```

### event_members

```text
id uuid primary key
event_id uuid references events
user_id uuid references profiles
event_role text
status text
created_at timestamptz
unique(event_id, user_id)
```

### groups

```text
id uuid primary key
event_id uuid references events
name text not null
description text
admin_label text
created_by uuid references profiles
join_token_hash text unique
registration_locked boolean default false
status text
created_at timestamptz
updated_at timestamptz
```

### group_memberships

```text
id uuid primary key
group_id uuid references groups
user_id uuid references profiles
role text check member/co_organiser/organiser/super_organiser
status text check pending/active/rejected/inactive
approved_by uuid
approved_at timestamptz
created_at timestamptz
updated_at timestamptz
unique(group_id, user_id)
```

### registration_questions

```text
id uuid primary key
group_id uuid references groups
label text not null
question_type text not null
is_required boolean
position integer
is_locked boolean
created_at timestamptz
```

### registration_options

```text
id uuid primary key
question_id uuid references registration_questions
label text not null
value text not null
position integer
```

### registration_answers

```text
id uuid primary key
membership_id uuid references group_memberships
question_id uuid references registration_questions
answer_json jsonb
updated_by uuid
created_at timestamptz
updated_at timestamptz
unique(membership_id, question_id)
```

### join_requests

```text
id uuid primary key
group_id uuid references groups
user_id uuid references profiles
status text check pending/accepted/rejected/cancelled
reviewed_by uuid
reviewed_at timestamptz
created_at timestamptz
unique(group_id, user_id)
```

### qr_credentials

```text
id uuid primary key
membership_id uuid references group_memberships
token_hash text unique not null
version integer not null
status text check active/revoked
issued_at timestamptz
revoked_at timestamptz
```

Only one active credential per membership.

### roll_calls

```text
id uuid primary key
event_id uuid references events
name text not null
notes text
created_by uuid
parent_roll_call_id uuid references roll_calls
status text check open/closed
started_at timestamptz
closed_at timestamptz
created_offline boolean
client_roll_call_id uuid unique
created_at timestamptz
```

### roll_call_groups

```text
id uuid primary key
roll_call_id uuid references roll_calls
group_id uuid references groups
unique(roll_call_id, group_id)
```

### attendance_records

```text
id uuid primary key
roll_call_id uuid references roll_calls
group_id uuid references groups
membership_id uuid references group_memberships
status text check present/absent
marked_at_device timestamptz
marked_at_server timestamptz
marked_by uuid references profiles
method text check qr/manual/offline_qr/offline_manual
client_record_id uuid unique
sync_origin text
created_at timestamptz
updated_at timestamptz
unique(roll_call_id, membership_id)
```

### audit_logs

```text
id uuid primary key
event_id uuid
group_id uuid
actor_id uuid
entity_type text
entity_id uuid
action text
old_data jsonb
new_data jsonb
metadata jsonb
created_at timestamptz
```

### device_tokens

```text
id uuid primary key
user_id uuid references profiles
expo_push_token text unique
device_id text
enabled boolean
last_seen_at timestamptz
created_at timestamptz
```

### sync_batches

```text
id uuid primary key
device_id text
user_id uuid
group_id uuid
status text
record_count integer
created_at timestamptz
completed_at timestamptz
```

## Required constraints

- One membership per user per group
- One attendance record per membership per roll call
- Unique `client_record_id`
- Unique active QR token hash
- Foreign-key integrity
- Check constraints for roles and statuses

## Indexes

Create indexes for:

- `group_memberships(group_id, status)`
- `group_memberships(user_id, status)`
- `attendance_records(roll_call_id, status)`
- `roll_call_groups(group_id)`
- `join_requests(group_id, status)`
- `qr_credentials(token_hash, status)`
- `audit_logs(event_id, created_at)`
