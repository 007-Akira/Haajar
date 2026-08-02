# Push notification operations

Haajar sends only operational notifications. Roll-call alerts are enabled by default after a
user explicitly grants Android notification permission. Join-request alerts are opt-in at the
database preference level and are not exposed as a mobile setting yet.

## Hosted setup

1. Apply `20260802001300_push_notification_foundation.sql` to the hosted project.
2. Regenerate `mobile/src/types/database.types.ts` from the hosted schema.
3. Configure the Expo/EAS project ID in the EAS project so development and production builds can
   request an Expo push token. Push notifications require a physical device and a development or
   production build; Expo Go is not supported by this setup.
4. Create a random `PUSH_WORKER_SECRET` as a Supabase Edge Function secret. Never use this value in
   the mobile app.
5. Deploy `send-push-notifications` without gateway JWT verification. The function authenticates
   scheduled calls with the `x-haajar-worker-secret` header and uses the platform-provided
   `SUPABASE_SERVICE_ROLE_KEY` only inside the server runtime.
6. Invoke the function from a trusted scheduler at a short interval. Store the worker secret in
   that scheduler's secret store, not in source control or notification tables.

Example deployment commands (replace placeholders through the shell environment, not source):

```sh
supabase secrets set PUSH_WORKER_SECRET
supabase functions deploy send-push-notifications --no-verify-jwt
```

The worker claims deliveries with row locks, sends them through Expo's push endpoint, records only
provider ticket IDs and non-sensitive error codes, retries failures up to five times, and revokes
tokens reported as unregistered.

## Data handling

- Push tokens are hashed for lookup and encrypted at rest. Plain tokens are returned only to the
  server-side delivery worker.
- A user may register multiple app installations. Registration and revocation are authenticated
  RPCs scoped to `auth.uid()`.
- Jobs are deduplicated per roll call or join request and deliveries per device.
- Payloads contain only a title, operational message, and allowlisted internal route. They do not
  contain phone numbers, email, registration answers, invitation tokens, or QR credentials.
- Signing out revokes the current app installation before ending the session.
