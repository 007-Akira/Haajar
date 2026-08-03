# Database testing

Haajar database lifecycle tests run only against a disposable local Supabase stack. Never run these tests with `--linked`, a hosted database URL, or production credentials.

## Local prerequisites

- Docker Engine or Docker Desktop
- Supabase CLI `2.111.0`
- Enough Docker resources for the local Supabase services

From the repository root:

```bash
supabase start
supabase db reset --local --no-seed
supabase db lint --local --level error
supabase test db
supabase stop --no-backup
```

`db reset --local --no-seed` recreates the local database and applies every migration in order. The lifecycle suites create deterministic fixtures and roll them back or clean them up. They do not require GitHub secrets, a Supabase project reference, or hosted credentials.

## CI structure

`.github/workflows/database-tests.yml` uses GitHub's Docker-capable Ubuntu runner and the official `supabase/setup-cli` action pinned to `2.111.0`. It performs:

1. local stack startup;
2. clean migration application;
3. database linting;
4. schema and RLS assertions;
5. registration, hierarchy, attendance, QR, offline, notification, and concurrency lifecycle suites;
6. unconditional local-stack shutdown.

The workflow has only `contents: read` permission and requires no repository secrets. Safe failure artifacts contain container names/statuses only. Database logs and TAP fixtures are not uploaded because they may contain synthetic credential material used by lifecycle tests.

## Adding a pgTAP test

Add a file named `*.test.sql` under `supabase/tests/database/`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select has_table('public', 'example', 'example table exists');

select * from finish();
rollback;
```

Prefer fixed UUIDs in the reserved test fixture ranges, deterministic labels, and assertions that do not depend on wall-clock delays. Use `set_config('request.jwt.claim.sub', ..., true)` plus `set local role authenticated` for RLS/RPC tests. Reset the role before privileged fixture inspection.

Run one suite with:

```bash
supabase test db supabase/tests/database/example.test.sql
```

Tests that intentionally verify concurrency may commit deterministic fixtures so independent database connections can see them. Such suites must remove their fixtures and should be run only after a clean local reset.

## Inspecting failures

The GitHub Actions log identifies the failed named suite and prints pgTAP diagnostics. Reproduce it locally by resetting the database and running that file directly. If startup fails, inspect local containers with:

```bash
docker ps --all --filter name=supabase_
supabase status
```

Do not paste local API keys, JWTs, QR tokens, invitation tokens, database URLs, or environment output into issues. Do not use `supabase status -o env` in CI logs.

## Production safety warning

Never run lifecycle or concurrency tests against the hosted Haajar project. In particular, never add `--linked`, `--db-url`, the production project reference, a database password, or a service-role key to this workflow. The tests create and mutate authentication, membership, attendance, QR, and notification fixtures by design.
