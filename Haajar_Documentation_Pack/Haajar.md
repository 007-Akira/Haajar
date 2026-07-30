# Haajar

**Haajar** is a real-time, QR-based group attendance and roll-call management application designed for trips, events, camps, tours, college activities, and other situations where people must be accounted for across multiple changing groups.

The application is primarily online and synchronises attendance with the backend almost immediately. It also includes an offline fallback so authorised organisers can continue taking attendance during weak or unavailable network conditions and synchronise the records later.

---

## 1. Problem Statement

Large trips and events often involve many participants who are divided into different groups at different stages.

For example, the same participant may be part of:

- A main industrial visit group
- A bus group
- A train-compartment group
- A hotel-room group
- A random activity group
- A temporary location-specific group

Manual attendance in these situations is slow and error-prone. Organisers may need to call names repeatedly, compare separate lists, contact missing members, and combine attendance collected by different volunteers.

Haajar addresses this by providing:

- Reusable user accounts
- Multiple independent groups
- Separate QR codes for every group membership
- Role-based access
- Central and group-level roll calls
- Real-time attendance synchronisation
- Offline attendance fallback
- Attendance history and auditability
- Push notifications
- Quick access to absent members' phone numbers

---

## 2. Product Goals

Haajar should:

1. Reduce the time required to conduct attendance.
2. Allow participants to belong to multiple groups.
3. Support groups that change according to location or travel stage.
4. Allow multiple authorised users to scan QR codes concurrently when online.
5. Continue functioning during weak network conditions.
6. Provide organisers with accurate attendance history.
7. Notify members when they have been marked present.
8. Remain usable without a paid deployment or paid SMS service.
9. Support Android app distribution through GitHub Releases and QR links.
10. Remain reusable beyond a single industrial visit.

---

## 3. Platform Scope

### Initial platform

- Android application
- APK distributed through GitHub Releases
- Installation link shared through QR code or WhatsApp
- Backend hosted on Supabase free tier

### iPhone participants

An iOS application is not part of the initial scope.

iPhone users can:

- Be added to groups by organisers
- Receive their group-specific QR images through WhatsApp
- Show those QR images during roll calls
- Be marked manually by organisers when required
- Receive phone calls from organisers if absent

### Future platform support

- iOS application
- App Store distribution
- Play Store distribution
- Web-based organiser dashboard, if later required

---

## 4. Authentication and User Profile

### Authentication

Users sign in using a verified Google account through Supabase browser-based Google OAuth.

The flow is:

1. User taps **Continue with Google**.
2. The Google sign-in page opens.
3. Google verifies the account.
4. Supabase creates the authenticated session.
5. The application opens through a configured deep link.
6. A first-time user completes their Haajar profile.

No phone-number OTP is required.

### Global user profile

Every user enters:

- Full name
- Phone number

The verified email address is obtained from the Google account.

A profile photo is not required.

### Profile fields

```text
User ID
Full name
Verified Google email
Phone number
Created date
Last updated date
```

A user may join multiple groups using the same Haajar account.

---

## 5. Core Data Model

Haajar should use a flexible group model rather than fixed bus, train, or classroom structures.

### Event or central space

An event represents the overall activity.

Examples:

- Industrial Visit 2026
- College Tour
- Training Camp
- Conference
- Volunteer Programme

### Groups

An event may contain any number of groups.

Examples:

- Bus 1
- Bus 2
- Train Compartment B4
- Room 203
- Team Alpha
- Visit Group 7
- Emergency Coordination Team

Groups do not need a fixed category structure in the member interface.

Optional administrative labels may be used internally to help super organisers filter or organise groups, but members only see groups they belong to.

### Group memberships

A person may belong to multiple groups within the same event.

Example:

```text
Member: Mathews

Groups:
- Main IV Group
- Bus 2
- Train Compartment B4
- Room 203
- Activity Team C
```

Each membership is independent and has:

- Its own role
- Its own membership status
- Its own group-specific QR credential
- Its own registration answers
- Its own attendance history

---

## 6. Roles and Permissions

Haajar uses four roles.

### 6.1 Member

A member can:

- View the event
- View only the groups they belong to
- View their role in each group
- Display their group-specific QR codes
- Receive roll-call notifications
- Receive attendance-confirmation notifications
- View their own attendance history
- View group members and phone numbers
- View group details and announcements

A member cannot:

- Approve join requests
- Start roll calls
- Scan attendance
- Edit their registration answers
- Promote or demote members
- Manually alter attendance

### 6.2 Co-organiser

A co-organiser can:

- View groups they manage
- View members and registration details in those groups
- Scan group-specific member QR codes
- Confirm member identity before marking attendance
- Conduct attendance for assigned groups
- View absent members and their phone numbers
- Open the native phone dialler
- Use an assigned group roster offline
- Synchronise locally stored attendance later

A co-organiser cannot:

- Freely mark members manually from the full list
- Approve or reject join requests unless explicitly extended later
- Change roles
- Edit group configuration
- Edit locked registration questions

### 6.3 Organiser / Admin

An organiser can:

- Create and manage a group
- Approve or reject join requests
- View members and their registration answers
- Promote or demote members
- Assign co-organisers
- Start group-level roll calls
- Scan QR codes
- Mark attendance manually
- Correct attendance records
- Close roll calls
- Download group rosters for offline use
- Export attendance
- Remove or deactivate members
- Regenerate membership QR credentials

### 6.4 Super Organiser

A super organiser can:

- Create and manage the overall event
- View all groups in the event
- Create groups before the event begins
- Assign organisers and co-organisers
- View all members and group assignments
- Start central roll calls
- Automatically create linked roll calls for selected groups
- View combined attendance across all groups
- View pending offline synchronisation status
- Access all roll-call history
- Correct records when necessary
- Export complete attendance reports

---

## 7. Group Creation and Membership

### Group creation

A group is created by an organiser or super organiser.

The creator becomes the organiser of that group.

A group contains:

- Group name
- Description
- Event reference
- Join code
- Join link
- Join QR code
- Registration form
- Organiser list
- Co-organiser list
- Member list
- Roll-call history
- Active or archived status

### Sharing a group

A group may be shared through:

- QR code
- Deep link
- WhatsApp
- Join code

Example:

```text
haajar://join/<random-group-token>
```

### Join flow

```text
Open join link or scan group QR
        ↓
Sign in with Google
        ↓
View group information
        ↓
Complete organiser-defined registration questions
        ↓
Submit join request
        ↓
Organiser reviews application
        ↓
Accept or reject
        ↓
Group-specific QR is generated after approval
```

There is no fixed group-size limit in the initial version.

The organiser only needs the ability to accept or reject applications.

---

## 8. Custom Registration Questions

Each group may define its own registration form before members begin joining.

### Prefilled fields

The application can prefill:

- Name
- Verified email
- Phone number

### Custom fields

The organiser may add fields such as:

- Register number
- Batch
- Department
- Class
- Bus number
- Train compartment
- Room number
- Team assignment
- Emergency contact
- Dietary preference
- Any other short group-specific information

### Supported field types

- Short text
- Number
- Single-choice
- Multiple-choice
- Dropdown
- Yes or no
- Phone number
- Required or optional

### Form locking rule

The registration form follows this lifecycle:

```text
Draft → Preview → Publish and Lock
```

After members begin joining:

- Questions cannot be edited.
- Questions cannot be deleted.
- Choices cannot be changed.
- New questions cannot be added.
- Members cannot modify their submitted answers.

If a correction is required, only the organiser may change the stored answer.

Organiser corrections should be recorded in an audit log.

### Scan display

When a member's QR is scanned, relevant profile and registration details should appear.

Example:

```text
Name: Mathews
Phone: 98XXXXXXXX
Register number: PTA23CS067
Batch: 2027
Class: S7 CSE
Train compartment: B4
```

A profile photo is not required.

---

## 9. Group-Specific QR Codes

Every member receives a separate QR code for every group they belong to.

Example:

```text
Main IV Group          → QR 1
Bus 2                  → QR 2
Train Compartment B4   → QR 3
Room 203               → QR 4
Activity Team C        → QR 5
```

### QR generation

A QR is generated only after membership is approved.

The QR should contain a random membership token.

Example:

```text
grpmbr:v1:6d1b11f7-2da4-4f8a-9d7a-...
```

The QR must not directly contain:

- Name
- Phone number
- Email
- Registration answers
- Group details in readable form
- Role in readable form

### QR resolution

The backend or local roster resolves the token to:

- User
- Group
- Role
- Membership status
- Phone number
- Registration answers
- QR validity

### QR regeneration

A new QR is generated when:

- A user is promoted
- A user is demoted
- Membership is revoked and restored
- A user is moved or re-added
- The organiser manually resets the credential
- The QR is suspected to have been shared or compromised

The old QR becomes invalid.

### QR image sharing

The organiser may generate and share a labelled QR image through WhatsApp.

The image may contain:

- Event name
- Group name
- Member name
- QR code
- Membership reference

Phone numbers should not be printed on the QR image.

---

## 10. Roll Calls

### Central roll call

A super organiser can start a central roll call.

The super organiser selects:

- Roll-call name
- Groups to include
- Optional notes
- Optional timer or cutoff
- Whether notifications should be sent

Example:

```text
Roll call: After boarding the train

Selected groups:
- Compartment B1
- Compartment B2
- Compartment B3
- Compartment B4
```

The system automatically creates linked group roll calls.

### Group roll call

An organiser may independently start a roll call for a group.

This is useful for:

- A standalone group
- A group-specific check
- An offline fallback
- A location where the central roll call cannot be received

### Offline naming

When a subgroup is offline, the organiser may manually create a local roll call using the same name as the central roll call.

A strict timer is not essential.

The system should primarily store:

- Roll-call name
- Start time
- Close time
- Group
- Creator
- Attendance records
- Synchronisation state

### Attendance lifecycle

Every member begins as:

```text
Unmarked
```

A member may become:

```text
Present
```

When the organiser closes the roll call:

```text
Remaining unmarked members → Absent
```

An organiser may later correct:

```text
Absent → Present
Present → Absent
```

Every correction must remain visible in the audit log.

### Attendance methods

- QR scan
- Manual marking by organiser
- Synced offline QR scan
- Synced offline manual marking

---

## 11. QR Scanning Workflow

QR scanning should feel immediate.

### Recommended flow

```text
Scan QR
        ↓
Resolve token from cached local roster
        ↓
Display member details immediately
        ↓
Organiser or co-organiser visually confirms identity
        ↓
Tap Confirm Present
        ↓
Store locally
        ↓
Send attendance to Supabase in background
        ↓
Show Synced or Pending Sync
```

### Why local roster caching is used

Even during normal online use, the active roster should be cached locally so that:

- QR details appear immediately
- The scanner does not wait for a network request
- Weak connectivity does not interrupt scanning
- Attendance can continue if the network drops
- Supabase synchronisation happens in the background

### Scan result display

The result screen should show:

- Member name
- Phone number
- Group name
- Role
- Custom registration answers
- Current attendance status
- Previous marking time, if already present

### Confirmation

A scan should not automatically mark attendance without confirmation.

The co-organiser should tap:

```text
Confirm Present
```

This allows them to verify that the person showing the QR is the correct person.

### Duplicate scanning

If the member has already been marked:

```text
Already marked present at 10:37 AM
```

The database and local SQLite database must both prevent duplicate records.

---

## 12. Real-Time Synchronisation

Haajar is an online-first application.

Under normal conditions:

1. A QR is scanned.
2. Member details appear from the local cache.
3. Attendance is saved locally.
4. The app immediately sends the update to Supabase.
5. Supabase confirms the write.
6. The local record is marked as synced.
7. Realtime listeners update organiser dashboards.
8. The member receives a push notification.

### Sync indicators

Every attendance record should have one of these states:

- Synced
- Pending sync
- Syncing
- Sync failed
- Conflict resolved

### Source of truth

- Supabase is the authoritative online source of truth.
- SQLite is a temporary local store and cache.
- Local pending records remain until Supabase confirms them.

---

## 13. Weak-Network and Offline Fallback

Haajar is not designed as an offline-first application, but it must continue functioning when the network is weak.

### One-device offline rule

For each group, only one organiser or selected co-organiser should take attendance while offline.

This avoids multiple unsynchronised devices collecting conflicting records for the same group.

When online, multiple authorised organisers may scan concurrently.

### Before going offline

The organiser selects:

```text
Make group available offline
```

The application downloads:

- Group details
- Member list
- Membership IDs
- QR tokens
- Names
- Phone numbers
- Roles
- Registration answers
- Current membership status
- Relevant roll-call metadata, when available

### While offline

The organiser can:

- Create a local roll call
- Scan QR codes
- View cached member details
- Confirm attendance
- Manually mark attendance if they are an organiser
- View absent members
- Open the phone dialler
- Close the local roll call

All records are stored in SQLite.

### Local record example

```json
{
  "client_record_id": "f86e6da1-...",
  "local_roll_call_id": "5bfcd...",
  "membership_id": "ad82...",
  "status": "present",
  "marked_at_device": "2026-07-30T10:37:14+05:30",
  "marked_by": "user-id",
  "method": "qr",
  "sync_status": "pending"
}
```

### When connectivity returns

```text
Pending local roll call
        ↓
Match or create server roll call
        ↓
Upload attendance records
        ↓
Resolve duplicates
        ↓
Update dashboards
        ↓
Mark local records as synced
        ↓
Send delayed attendance notifications
```

### Offline conflict handling

If an online and offline record exist for the same member and roll call:

1. Keep one final attendance row.
2. Preserve the earliest valid present time.
3. Preserve all actions in the audit log.
4. Allow organiser corrections to determine the final state.
5. Never discard the full offline batch because of one conflict.

---

## 14. Manual Attendance

Only organisers and super organisers can manually update attendance from the member list.

Manual attendance is required when:

- A participant's phone is dead
- A participant cannot access their QR
- A QR is damaged or unavailable
- The organiser needs to correct a record
- A participant is found after initially being absent

Manual attendance flow:

```text
Open roll call
        ↓
Open member list
        ↓
Search or select member
        ↓
Mark Present or Absent
        ↓
Save reason, if correcting a previous result
        ↓
Synchronise
```

Co-organisers should primarily mark attendance through QR scanning.

---

## 15. Absentee Handling

After or during a roll call, the organiser should see:

- Total members
- Present count
- Absent or unmarked count
- Names of missing members
- Phone numbers
- Call button
- Current sync state

Example:

```text
Total members: 48
Present: 44
Absent or unmarked: 4
```

Tapping the call button should open:

```text
tel:+91XXXXXXXXXX
```

The application opens the native phone dialler. It does not automatically place the call.

When an absent member is found, the organiser may:

- Scan their QR
- Mark them manually
- Correct their attendance record

---

## 16. Push Notifications

Android users should receive push notifications for:

- Join request accepted
- Join request rejected
- Added to a group
- Removed from a group
- Promoted
- Demoted
- Roll call started
- Attendance marked present
- Attendance corrected
- Important group announcements

### Attendance confirmation

Example:

```text
You have been marked present for "After boarding the train" in Compartment B4.
```

If marked manually:

```text
You were marked present manually by the organiser.
```

### Offline notification behaviour

If attendance is recorded offline, the member notification is sent only after successful synchronisation.

The scanning device should show:

```text
Attendance saved locally.
Member notification will be sent after sync.
```

---

## 17. Member Visibility

Members should see only:

- Events they belong to
- Groups they belong to
- Their role in each group
- Their group-specific QRs
- Relevant active roll calls
- Their attendance history
- Members of their groups
- Group members' phone numbers

Members do not need to see:

- Groups they do not belong to
- Complete event structure
- Administrative category labels
- Other groups' attendance
- Pending applications
- Role-management controls

### Super-organiser visibility

Super organisers should see:

- Every group
- Every member
- All roles
- All group assignments
- All active roll calls
- All roll-call history
- Combined attendance totals
- Unsynchronised group status
- Audit logs
- Export controls

---

## 18. Attendance History and Audit Logs

Each roll call should retain:

- Roll-call name
- Group
- Central roll-call reference, when applicable
- Start time
- Closing time
- Creator
- Total members
- Present members
- Absent members
- Marking time
- Marked by
- Verification method
- Device sync time
- Offline or online origin
- Corrections

### Audit logging

The audit log should record:

- Join request approval or rejection
- Role promotions and demotions
- QR regeneration
- Membership deactivation
- Registration-answer corrections
- Attendance corrections
- Roll-call creation and closure
- Offline synchronisation conflicts
- Group archival

Historical records should never be silently overwritten.

---

## 19. Group and Membership Lifecycle

### Membership removal

Removing a member should deactivate the membership rather than delete it permanently.

This preserves:

- Attendance history
- Audit history
- Previous role history
- Registration answers

The membership QR becomes invalid.

### Group deletion

Groups should be archived rather than permanently deleted.

Archived groups should:

- Become read-only
- Retain attendance history
- Retain member history
- Reject new join requests
- Invalidate active join links
- Be restorable by authorised users

---

## 20. CSV and Google Sheets Export

Supabase remains the source of truth.

Google Sheets should not be used as the live database.

The application should generate CSV files that can be opened in Google Sheets.

### Suggested export columns

```text
Event
Group
Roll-call name
Member name
Phone number
Registration answers
Status
Marked time
Marked by
Verification method
Offline or online
Synchronised time
```

Export options:

- Current roll call
- One group's history
- Entire event
- Present members only
- Absent members only

Automatic Google Sheets synchronisation is outside the initial scope.

---

## 21. Recommended Technology Stack

### Mobile application

- React Native
- Expo
- TypeScript
- Expo Router

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- Supabase Edge Functions
- PostgreSQL functions

### Authentication

- Supabase browser-based Google OAuth
- Custom Expo deep-link callback

### Offline and caching

- Expo SQLite
- NetInfo
- Custom synchronisation queue

### QR

- Expo Camera
- React Native QR SVG library
- View capture for QR image sharing

### Notifications

- Expo Notifications
- Expo Push Service
- Server-side notification dispatch through Supabase Edge Functions

### State management

- TanStack Query for server data
- Zustand for local UI state
- SQLite for persistent offline data

### Forms and validation

- React Hook Form
- Zod

### Export and sharing

- Papa Parse
- Expo FileSystem
- Expo Sharing
- React Native View Shot

### Distribution

- Expo EAS Build or local Gradle build
- APK hosted on GitHub Releases
- Installation link shared through QR code or WhatsApp

---

## 22. Suggested Database Tables

```text
profiles
events
event_members
groups
group_memberships
group_organisers
registration_forms
registration_questions
registration_options
registration_answers
join_requests
qr_credentials
roll_calls
roll_call_groups
attendance_records
attendance_audit_logs
role_change_logs
device_tokens
notification_logs
sync_batches
sync_conflicts
archived_entities
```

### Important constraints

```text
UNIQUE(user_id, group_id)
```

One active membership per user per group.

```text
UNIQUE(roll_call_id, membership_id)
```

One final attendance record per member per roll call.

```text
UNIQUE(client_record_id)
```

Prevents duplicate uploads after sync retries.

```text
One active QR credential per membership
```

Older credentials must be revoked.

---

## 23. Suggested Local SQLite Tables

```text
cached_events
cached_groups
cached_memberships
cached_registration_answers
cached_qr_credentials
local_roll_calls
local_attendance
sync_queue
sync_batches
sync_metadata
app_settings
```

### Local constraints

```text
UNIQUE(local_roll_call_id, membership_id)
```

Prevents duplicate local attendance.

```text
UNIQUE(client_record_id)
```

Makes synchronisation idempotent.

---

## 24. Main Application Screens

### Authentication

- Splash screen
- Continue with Google
- OAuth callback
- Profile setup

### Member screens

- Home
- My events
- My groups
- Group details
- Show group QR
- Attendance history
- Group members
- Notifications
- Profile

### Co-organiser screens

- Managed groups
- Active roll calls
- QR scanner
- Scan confirmation
- Present list
- Absent list
- Call absentee
- Offline roster
- Sync status

### Organiser screens

- Create group
- Edit group details
- Registration-form builder
- Publish and lock form
- Join requests
- Member management
- Promote or demote
- Start roll call
- Manual attendance
- Roll-call history
- Export CSV
- Regenerate QR
- Archive group

### Super-organiser screens

- Event dashboard
- All groups
- All members
- Create group
- Assign organisers
- Start central roll call
- Select target groups
- Combined attendance
- Offline sync status
- Complete history
- Audit logs
- Event export

---

## 25. Recommended User Flows

### Create a group

```text
Sign in
→ Create event or select event
→ Create group
→ Add name and description
→ Build registration form
→ Preview
→ Publish and lock
→ Share join link or QR
```

### Join a group

```text
Scan join QR or open link
→ Sign in
→ Complete registration form
→ Submit
→ Wait for approval
→ Receive approval notification
→ Open group
→ View group QR
```

### Conduct attendance online

```text
Open managed group
→ Start or open roll call
→ Ensure roster is cached
→ Open scanner
→ Scan member QR
→ Review details
→ Confirm present
→ Save locally
→ Sync immediately
→ Update dashboard
→ Notify member
```

### Conduct attendance offline

```text
Download roster in advance
→ Open group
→ Create local roll call
→ Scan QR
→ Review cached details
→ Confirm present
→ Save to SQLite
→ Continue scanning
→ Sync when network returns
```

### Central roll call

```text
Super organiser selects event
→ Start central roll call
→ Enter roll-call name
→ Select groups
→ Create linked group roll calls
→ Notify relevant members and organisers
→ Monitor combined progress
→ View pending offline groups
→ Close roll call
```

---

## 26. MVP Scope

### Included in MVP

- Android app
- Google OAuth
- User profile
- Event creation
- Group creation
- Multiple group membership
- Custom locked registration forms
- Join by link, code, or QR
- Accept or reject requests
- Four roles
- Promotion and demotion
- Separate QR per group membership
- QR regeneration
- QR scanning
- Cached roster lookup
- Immediate member-detail display
- Background Supabase sync
- Synced and pending states
- Manual attendance by organisers
- Present and absent status
- Central roll calls
- Linked group roll calls
- Group-level roll calls
- Push notifications
- Member list and phone numbers
- Call absentee button
- Offline roster download
- Local SQLite storage
- Later synchronisation
- Roll-call history
- Audit logs
- CSV export
- GitHub APK distribution
- QR image sharing for non-Android participants

### Excluded from MVP

- iOS application
- Phone OTP
- Profile photos
- Facial recognition
- Live location
- Automatic WhatsApp messaging
- Automatic SMS alerts
- Emergency-reporting module
- Fixed group-size limit
- Rotating QR codes
- Automatic Google Sheets synchronisation
- Advanced lateness analytics
- Web dashboard
- Play Store publishing
- App Store publishing

---

## 27. Non-Functional Requirements

### Performance

- QR recognition should be near-instant.
- Cached member details should appear without waiting for Supabase.
- Attendance writes should sync in the background.
- Realtime counts should update quickly under normal connectivity.
- The app should remain responsive with at least 150 participants and multiple organisers.

### Reliability

- Pending records must survive app restarts.
- Sync retries must not create duplicates.
- Local records must not be deleted before server confirmation.
- One failed record must not block an entire batch.
- Conflicts must be logged and recoverable.

### Security

- Use Supabase Row Level Security.
- QR tokens must be random and non-guessable.
- Personal information must not be encoded directly into QR codes.
- Role checks must happen on the server.
- Old QR credentials must be revocable.
- Notification sending must happen server-side.
- Attendance constraints must be enforced by PostgreSQL.
- Service-role credentials must never be embedded in the app.

### Privacy

- Group members may view phone numbers within their shared groups.
- Users should not see unrelated groups or unrelated event members.
- QR images should not display phone numbers.
- Export access should be limited to organisers and super organisers.

### Maintainability

- Use TypeScript.
- Keep Supabase schema migrations in version control.
- Separate UI, database, offline sync, notifications, and role logic.
- Use reusable permission checks.
- Document all database functions and policies.

---

## 28. Zero-Cost Deployment Plan

### Expected free components

- React Native
- Expo
- TypeScript
- Supabase free tier
- PostgreSQL
- Supabase Auth
- Expo Notifications
- Expo SQLite
- GitHub repository
- GitHub Releases
- QR generation and scanning
- CSV export
- Google Sheets manual import

### Not included because they may require payment

- Apple Developer membership
- iOS TestFlight distribution
- SMS OTP
- Automated SMS notifications
- Paid hosting
- Custom domain
- Play Store registration

### Initial distribution flow

```text
Build Android APK
→ Upload to GitHub Releases
→ Generate QR code for the release page
→ Share QR or link through WhatsApp
→ Users download and install APK
```

---

## 29. Development Phases

### Phase 1: Foundation

- Initialise Expo TypeScript project
- Configure Expo Router
- Create Supabase project
- Configure browser-based Google OAuth
- Configure deep linking
- Create profile flow
- Implement basic navigation

### Phase 2: Events and groups

- Create event schema
- Create group schema
- Build event and group screens
- Implement role model
- Implement group visibility rules

### Phase 3: Registration

- Build custom question editor
- Add preview and lock workflow
- Build join application
- Add accept and reject controls
- Store registration answers

### Phase 4: QR membership

- Generate random QR credentials
- Display separate QR per group
- Implement QR revocation and regeneration
- Build QR image sharing

### Phase 5: Attendance

- Create roll calls
- Implement QR scanning
- Display cached member details
- Add confirmation step
- Add manual attendance
- Add present and absent states
- Add duplicate protection

### Phase 6: Real-time synchronisation

- Add Supabase Realtime
- Add background sync
- Add synced and pending indicators
- Build combined organiser dashboards

### Phase 7: Offline fallback

- Add Expo SQLite
- Download rosters
- Cache QR lookups
- Create local roll calls
- Add sync queue
- Add idempotent upload
- Add conflict resolution

### Phase 8: Notifications

- Register device push tokens
- Send roll-call notifications
- Send attendance-confirmation notifications
- Send role and membership notifications

### Phase 9: History and export

- Build roll-call history
- Add audit logs
- Add CSV export
- Add absentee filtering
- Add call button

### Phase 10: Testing and deployment

- Test multiple simultaneous scanners
- Test duplicate scans
- Test network interruption
- Test app restart with pending records
- Test offline-to-online sync
- Test role permissions
- Test QR invalidation
- Build release APK
- Publish through GitHub Releases

---

## 30. Acceptance Criteria

The MVP is considered functionally complete when:

1. A user can sign in using Google.
2. A user can create a group.
3. An organiser can define and lock registration questions.
4. A user can join through a QR or link.
5. An organiser can accept or reject the request.
6. The approved user receives a separate QR for that group.
7. A user can belong to multiple groups and view separate QRs.
8. A co-organiser can scan a QR and see member details immediately from cache.
9. A co-organiser can confirm the member as present.
10. The attendance record synchronises to Supabase.
11. Duplicate scans do not create duplicate attendance.
12. An organiser can manually mark attendance.
13. A super organiser can start a central roll call for selected groups.
14. Linked group roll calls are created automatically.
15. Members receive a notification when marked present.
16. The organiser dashboard updates in real time.
17. Attendance can be recorded without internet using a downloaded roster.
18. Offline records synchronise later without duplication.
19. Roll-call history remains accessible.
20. Attendance can be exported as CSV.
21. The APK can be installed from a GitHub Release.
22. Non-Android participants can use shared QR images.

---

## 31. Future Extensions

Possible future additions:

- iOS application
- Web organiser dashboard
- Emergency alerts
- Live location with explicit consent
- Automated WhatsApp integration
- SMS alerts
- QR rotation
- NFC attendance
- Bluetooth proximity verification
- Geofenced roll calls
- Advanced lateness analysis
- Scheduled roll calls
- Multiple institutions
- Organisation-level administration
- Play Store and App Store releases
- Direct Google Sheets synchronisation
- Printable group cards
- QR batch export
- Attendance analytics
- Event templates
- Reusable registration templates

---

## 32. Final Product Definition

> **Haajar is a real-time QR-based attendance and roll-call management application for events and dynamic groups. It supports reusable Google-authenticated accounts, separate QR codes for every group membership, custom locked registration forms, role-based attendance management, central and group-level roll calls, real-time Supabase synchronisation, push notifications, and SQLite-based offline fallback.**

### GitHub repository description

> **Real-time QR-based attendance and roll-call management for events and dynamic groups, with offline sync fallback.**
