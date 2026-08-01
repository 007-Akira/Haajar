# Haajar development data testing

These procedures are for local or dedicated development environments only. Never use a production
database password, service-role key, Google client secret, or real member data in seed files, test
commands, or the mobile application.

## Local reset, migration, seed, and type workflow

Prerequisites are Docker and the Supabase CLI. Run commands from the repository root.

```bash
npx supabase start
npx supabase db reset
npx supabase test db
npx supabase gen types typescript --local --schema public > mobile/src/types/database.types.ts
cd mobile
npx prettier --write src/types/database.types.ts
npm run check
```

`supabase db reset` destroys only the local Supabase database, reapplies every file in
`supabase/migrations/`, and then runs `supabase/seed.sql`. The seed contains deterministic event and
group IDs but no hosted credentials. It attaches records to the oldest local Auth user when one
exists; otherwise it safely skips and prints a notice.

To populate the optional seed after creating a local user in Studio:

1. Open local Studio at `http://127.0.0.1:54323` and create a disposable Auth user.
2. Run the seed against the local database:

   ```bash
   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.sql
   ```

`postgres:postgres` above is the Supabase CLI's disposable local default, not a hosted secret. Do
not reuse it outside local development. The committed seed is idempotent.

The pgTAP suite under `supabase/tests/database/` creates and rolls back its own disposable accounts
and data. It does not depend on the optional seed.

## Two-account manual test plan

Use two disposable Google accounts in a dedicated development Supabase project. Call them Account A
and Account B. Complete both Haajar profiles before starting.

1. Sign in as Account A, create a trip, and confirm Home shows it with Account A as super organiser.
2. Open the trip, create an internal group, and confirm Account A appears as that group's organiser.
3. Record the event and group URLs/IDs only for navigation testing; never treat them as credentials.
4. Sign out and sign in as Account B.
5. Confirm Account B's Home does not list Account A's trip.
6. Attempt to open Account A's event and group routes using the recorded IDs. Confirm the app shows
   an access/not-member state and no member, management, QR, or attendance controls.
7. Confirm Account B cannot read Account A's Everyone list or internal group member list.
8. Using Account B's authenticated client/session, attempt `create_group` for Account A's event.
   Confirm it returns the safe permission-denied error and creates no group.
9. Attempt direct `event_members` or `group_memberships` updates/inserts assigning Account B an
   organiser or super-organiser role. Confirm RLS rejects the write and the database role is
   unchanged. Never use a service-role client for this check.
10. Sign back in as Account A and confirm the real UI still reports event role `super organiser`,
    group role `organiser`, the correct event/group relationship, and unchanged member lists.
11. If Account B is later added through an approved development-only database/admin procedure,
    repeat the reads and verify it sees only the event/groups its active memberships allow.

## Automated coverage

Run application model/error tests:

```bash
cd mobile
npm test
```

Run local database integration tests:

```bash
npx supabase test db
```

The database suite covers authenticated event creation, creator role assignment, event filtering,
group creation, parent-event placement, group organiser assignment, unauthorised RPC calls,
self-elevation attempts, and unrelated event/group/member reads. The mobile test covers all current
database-to-display role mappings and user-safe permission/network error normalisation.

## Known limitations

- Google OAuth itself is tested manually; local pgTAP tests authenticate by setting disposable JWT
  claims inside a rolled-back transaction.
- Current profile RLS exposes another user's profile only when both users share an active internal
  group. Consequently, an ordinary event member may see incomplete names/phones in Everyone until a
  restricted directory RPC or similarly narrow database interface is introduced.
- Internal-group counts in Everyone reflect rows visible through current RLS for the caller.
- These tests do not cover attendance, QR, registration answers, join requests, notifications,
  Realtime, offline sync, or SQLite.
