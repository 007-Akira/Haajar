# Notification Design

## Technology

- Expo Notifications
- Expo Push Service
- Supabase Edge Function for sending
- Device tokens stored per installation

## Notification types

### Membership

- Join request accepted
- Join request rejected
- Added to group
- Removed from group
- Role promoted
- Role demoted

### Roll call

- Roll call started
- Group roll call started
- Central roll call started
- Roll call closed

### Attendance

- Marked present
- Marked present manually
- Attendance corrected
- Offline attendance synchronised

### Administration

- Group announcement
- Offline sync warning for organisers
- Failed sync requiring attention

## Example attendance notification

```text
Marked present

You have been marked present for
"After boarding the train" in Compartment B4.
```

## Privacy

Lock-screen notification text should avoid unnecessary personal data.

Do not include:

- Phone numbers
- Registration answers
- Complete absentee lists

## Offline behaviour

Attendance recorded offline does not immediately trigger a server notification.

After successful sync:

1. Server accepts attendance.
2. Server queues notification.
3. Member receives confirmation.
4. Notification log stores delivery attempt.

## Token management

Store:

```text
user_id
device_id
expo_push_token
enabled
last_seen_at
platform
```

Deactivate invalid push tokens after provider errors.
