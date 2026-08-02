# Offline attendance cache security model

The first offline milestone caches only the active roll-call context and its captured roster. It
does **not** enable offline QR resolution or attendance mutations.

## Cached data

Every row is scoped by the authenticated user plus event, group, and roll-call identifiers. The
cache contains group/trip labels, roll-call timing, active roster membership IDs, roles, display
names, and operational phone numbers already available to authorised attendance organisers. It
does not mirror unrelated hosted data. The cache is replaced atomically and carries a freshness
timestamp; UI must warn when it is older than fifteen minutes.

The SQLite database is application-sandboxed. Expo SQLite does not provide transparent database
encryption by default, so no recoverable secrets are stored. Device-level encryption and Android
screen lock remain important operational controls.

## QR material decision

Current membership credentials use high-entropy tokens and server-side hashes. Downloading hashes
would permit offline verification, but it also creates a portable verifier on an organiser's lost
or compromised device and enables unlimited offline guessing attempts. Server-side encrypted QR
recovery material would be even more sensitive and must never be downloaded.

The offline scanning milestone now downloads credential hashes only through an operator-authorised
RPC. The bundle is scoped to one active roll call/group, expires after four hours, includes known
revoked hashes so they can be rejected, and is deleted on closure, permission loss, or sign-out.
Server-side encrypted QR recovery material is never downloaded. A lost unlocked organiser device
can still expose these time-limited verifiers and the minimal roster; device screen locks and prompt
sign-out/revocation remain required. Device attestation and database-level encryption remain future
hardening.

Offline scans queue only membership IDs and idempotency keys—never raw QR payloads. The backend
rechecks operator permission, live membership, roll-call state, group scope, and uniqueness before
creating attendance. Already-marked records reconcile successfully; closed or revoked membership
outcomes remain visible conflicts.

## Lifecycle

- Cache records are user-scoped and cleared before sign-out.
- Closed roll-call caches are invalidated.
- Archived group/event screens do not download a roster.
- Atomic roster replacement removes memberships no longer present in the server snapshot.
- SQLite schema changes use `PRAGMA user_version` migrations.
- An integrity failure deletes only this derived cache and recreates it; hosted data is unchanged.
- A stale or missing cache is never presented as ready for offline use.
