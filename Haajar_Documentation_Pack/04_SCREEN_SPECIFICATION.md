# Screen Specification

Every screen must define loading, empty, error, offline, and permission-denied states.

## Authentication

### Splash

Components:

- Haajar logo
- Brand text
- Session-loading indicator

### Sign In

Components:

- Product value statement
- Continue with Google
- Privacy note
- App version

### Profile Setup

Fields:

- Full name
- Phone number

Actions:

- Save and continue

## Home

Components:

- Greeting
- Active roll-call banner
- Event cards
- Create event
- Join group
- Pending applications

States:

- No events
- Pending application
- Network unavailable
- Session expired

## Event Overview

Components:

- Event title and description
- My groups
- Active roll calls
- Role indicator
- Super-organiser actions when authorised

## Group Invitation Preview

Components:

- Event name
- Group name
- Organiser
- Description
- Continue to registration

## Registration Form

Components:

- Prefilled profile fields
- Custom questions
- Validation
- Submit request

## Application Status

States:

- Pending
- Accepted
- Rejected

## My Groups

Each card shows:

- Group name
- Event name
- Role
- Active roll-call badge
- Sync indicator where relevant

## Group Overview

Components:

- Group title
- Role badge
- Member count
- Show QR
- Active roll call
- Quick actions
- Recent attendance

## My Group QR

Components:

- Member name
- Event name
- Group name
- Role
- QR
- Share QR
- Save QR

Never display the raw token.

## Group Members

Components:

- Search
- Name
- Phone
- Role
- Registration details
- Call action

## Attendance History

Components:

- Roll-call name
- Date
- Group
- Status
- Marked time
- Method

## Create Group Roll Call

Fields:

- Name
- Optional note
- Notify members

## Create Central Roll Call

Fields:

- Name
- Optional note
- Target-group multiselect
- Select all
- Notify members

## Active Roll-Call Dashboard

Components:

- Roll-call name
- Group
- Present count
- Unmarked count
- Absent count after closure
- Progress
- Scan button
- Manual attendance
- Member list
- Close roll call
- Sync state

## Combined Central Dashboard

Components:

- Overall totals
- Group status cards
- Synced groups
- Pending-sync groups
- Not-started groups

## QR Scanner

Components:

- Full-screen camera
- Scan frame
- Flash toggle
- Group and roll-call header
- Online/offline indicator
- Pending sync count
- Close scanner

The scanner stays open after a successful mark.

## Member Verification Bottom Sheet

Components:

- Name
- Phone
- Group
- Role
- Registration answers
- Current attendance status
- Confirm Present
- Cancel

## Scan Result States

- Success — synced
- Success — pending sync
- Already present
- Wrong group
- Invalid token
- Revoked QR
- Outdated roster
- Membership inactive

## Manual Attendance

Components:

- Search
- Status filter
- Member rows
- Mark present
- Mark absent
- Correction reason

## Absentee List

Components:

- Name
- Phone
- Registration details
- Call
- Scan
- Mark present

## Registration-Form Builder

Components:

- Add question
- Select type
- Required toggle
- Choice editor
- Reorder
- Preview
- Publish and lock

## Join Requests

Tabs:

- Pending
- Accepted
- Rejected

Each request shows profile and custom answers.

## Member Management

Actions:

- Promote
- Demote
- Remove
- Correct answers
- Regenerate QR

## Offline Roster

Components:

- Download/update roster
- Last synced
- Member count
- Pending records
- Sync now
- Remove local copy

## Notifications

Types:

- Roll call started
- Attendance marked
- Attendance corrected
- Request accepted/rejected
- Role changed
- Group membership changed

## Profile and Settings

- Name
- Email
- Phone
- Notification permission
- Camera permission
- Pending sync
- Retry sync
- Sign out
