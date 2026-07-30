# Information Architecture and Navigation

## Global flow

```text
Splash
→ Google Sign-In
→ Profile Setup
→ Home
```

## Bottom navigation

- Home
- Groups
- Notifications
- Profile

The scanner is contextual and must not be a permanent bottom tab.

## Main hierarchy

```text
Home
├── Events
│   └── Event Overview
│       ├── My Groups
│       ├── Active Roll Calls
│       ├── Event Details
│       └── Super-organiser Controls
├── Join Group
├── Notifications
└── Profile
```

## Group hierarchy

```text
Group Overview
├── My QR
├── Members
├── Roll Calls
├── Attendance History
├── Scanner
├── Manual Attendance
├── Join Requests
├── Member Management
├── Offline Roster
└── Group Settings
```

Visible items depend on the user's role in that group.

## Member-facing visibility

Members see:

- Events they belong to
- Groups they belong to
- Their group-specific QRs
- Relevant roll calls
- Their own attendance history
- Members and phone numbers of shared groups

Members do not see:

- Unassigned groups
- Event-wide administration
- Other groups' attendance
- Join-request queues
- Audit logs
