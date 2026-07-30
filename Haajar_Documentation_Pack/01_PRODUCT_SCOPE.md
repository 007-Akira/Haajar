# Product Scope

## Product definition

Haajar is an Android-first, real-time QR attendance and roll-call application for events containing multiple dynamic groups.

The application is online-first:

- Member details are resolved from a locally cached roster.
- Attendance is written locally first for responsiveness.
- The record is synchronised with Supabase immediately when connectivity is available.
- SQLite is used as a cache and temporary queue, not as the permanent source of truth.
- Supabase remains the authoritative source of truth.

## MVP goals

- Google-authenticated reusable accounts
- Event and group creation
- Multiple group memberships per user
- Custom locked registration forms
- Join requests and organiser approval
- Separate QR per group membership
- Four roles
- QR scanning and visual confirmation
- Manual attendance by organisers
- Central and group roll calls
- Real-time dashboards
- Push notifications
- Offline fallback
- Attendance history
- CSV export
- GitHub APK distribution

## Explicitly excluded from MVP

- iOS application
- SMS OTP
- Automatic WhatsApp messaging
- Live location
- Facial recognition
- Rotating QR codes
- Emergency module
- Web dashboard
- App Store and Play Store releases
- Automatic Google Sheets synchronisation
- Advanced lateness analytics

## Core product rules

1. A user may belong to multiple groups.
2. Every group membership has a separate QR.
3. QR tokens contain no readable personal information.
4. Registration forms are locked after publication.
5. Members cannot edit submitted answers.
6. Organisers may correct answers, with audit logging.
7. Co-organisers scan attendance.
8. Organisers and super organisers may mark manually.
9. A central roll call may create linked roll calls for selected groups.
10. One designated device should collect attendance for a group while offline.
