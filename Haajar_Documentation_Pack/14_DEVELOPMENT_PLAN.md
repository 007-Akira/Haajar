# Development Plan

## Stage 0: Product and design lock

- Confirm information architecture
- Confirm screen inventory
- Define design tokens
- Create Stitch prototypes
- Review critical flows
- Freeze MVP scope

## Stage 1: Foundation

- Initialise Expo TypeScript project
- Configure Expo Router
- Add HeroUI Native
- Create theme and tokens
- Configure Supabase
- Configure OAuth and deep links
- Build profile setup

## Stage 2: Static vertical slice

Build static screens for:

1. Home
2. Event overview
3. Group overview
4. My QR
5. Active roll-call dashboard
6. Scanner
7. Member verification sheet
8. Central dashboard

## Stage 3: Backend foundation

- Create migrations
- Create RLS policies
- Create role helper functions
- Add seed data
- Build event/group queries

## Stage 4: Membership

- Registration-form builder
- Form lock
- Join request
- Approval/rejection
- QR issuance
- Role changes

## Stage 5: Attendance vertical slice

Implement:

```text
Open group
→ Start roll call
→ Cache roster
→ Scan QR
→ Show details
→ Confirm
→ Local write
→ Supabase sync
→ Realtime dashboard
→ Member notification
```

Do not continue until this is reliable.

## Stage 6: Central roll calls

- Select groups
- Create linked sessions
- Combined dashboard
- Group progress
- Close sessions

## Stage 7: Offline fallback

- SQLite schema
- Roster download
- Queue
- Retry
- Batch sync
- Conflict handling
- Restart recovery

## Stage 8: Administration

- Manual attendance
- Absentee list
- Call action
- Member management
- Audit logs
- CSV export

## Stage 9: Hardening

- Security review
- Concurrency tests
- Offline tests
- Load tests
- Field test

## Stage 10: Release

- Build APK
- Test release signing
- Publish GitHub Release
- Create installation QR
- Prepare organiser instructions
