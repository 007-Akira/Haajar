# Testing Strategy

## Test layers

### Unit tests

Test:

- Role helpers
- Form validation
- QR token parsing
- Attendance-state transitions
- Sync queue ordering
- Conflict resolution
- CSV generation

### Component tests

Test:

- Role-based action visibility
- Member verification sheet
- Attendance badges
- Sync indicators
- Registration question renderer
- Confirmation dialogs

### Integration tests

Test:

- Google OAuth callback
- Join request submission
- Request approval and QR issuance
- Role change and QR revocation
- Central roll-call creation
- Attendance RPC idempotency
- Push notification dispatch
- Offline batch sync

### End-to-end tests

Critical journey:

```text
Sign in
→ Join group
→ Approval
→ Display QR
→ Start roll call
→ Scan QR
→ Confirm
→ Sync
→ Dashboard update
→ Member notification
```

## Concurrency tests

Simulate:

- Multiple organisers scanning different members
- Two organisers scanning the same member
- Manual attendance and QR scan arriving together
- Offline and online records for the same member
- Repeated sync retries after lost responses

## Offline tests

- Network disappears after scan
- Network disappears during batch upload
- App is killed with pending records
- Phone restarts
- Roster is stale
- Membership is revoked while device is offline
- Duplicate local scan
- Storage is nearly full

## Security tests

- Member calls organiser-only RPC
- Co-organiser attempts manual marking
- Organiser accesses unrelated group
- User attempts role escalation
- Revoked QR is scanned
- Random token brute-force attempts
- Service-role key absence in app bundle
- Export access by member
- RLS policy regression

## Performance targets

- QR recognition: effectively immediate under normal camera conditions
- Cached member lookup: under 100 ms target
- Verification sheet display: under 300 ms target
- Background attendance sync: usually under 2 seconds on stable mobile data
- 150-member roster search: immediate
- Multiple concurrent scanners: no duplicate final records

## Field test

Before the IV:

1. Create a test event.
2. Add at least 30 test memberships.
3. Use 3–5 organiser phones.
4. Run online attendance.
5. Disable network on one phone.
6. Continue attendance offline.
7. Restore network.
8. Verify reconciliation.
9. Export CSV.
10. Inspect audit logs.
