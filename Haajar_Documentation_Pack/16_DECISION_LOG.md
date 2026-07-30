# Decision Log

## Product

- Name: Haajar
- Initial platform: Android
- Distribution: GitHub Releases
- Backend: Supabase
- Main database: PostgreSQL
- Local cache: Expo SQLite
- Authentication: Supabase browser-based Google OAuth
- Phone OTP: excluded
- iOS app: excluded from MVP

## User model

- Name and phone entered by user
- Email obtained from verified Google account
- No profile photo
- One reusable account
- Multiple group memberships

## Roles

- Member
- Co-organiser
- Organiser
- Super organiser

## Groups

- Groups are flexible and may represent any purpose.
- Members see only assigned groups.
- Super organisers see all event groups.
- A user may belong to multiple groups.
- Each group membership has a separate QR.

## Registration

- Group-specific custom questions
- Name/email/phone may be prefilled
- Form is published and locked
- Members cannot edit answers
- Organisers may correct answers with audit logging

## Attendance

- Present and absent are the final visible states.
- Unmarked is an internal open-roll-call state.
- Co-organisers scan QR.
- Organisers may mark manually.
- Super organiser may start a central roll call.
- Linked group roll calls are created automatically.
- Timer is optional and not central to the MVP.

## QR

- Random opaque token
- No personal information encoded
- New QR after role change or manual reset
- Old QR revoked

## Synchronisation

- Online-first
- Roster cached locally
- Member details shown without waiting for network
- Attendance saved locally
- Immediate background sync
- Synced/pending state displayed
- One-device offline rule per group

## Notifications

- Roll-call start
- Attendance confirmation
- Attendance correction
- Join decision
- Role change
