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

Therefore this milestone downloads neither credential hashes nor encrypted recovery material.
Offline QR resolution remains disabled until a separate design introduces scanner-device
authorisation, short-lived roll-call-specific verifier material, explicit expiry, device
attestation/lock controls where practical, and clearing on closure.

## Lifecycle

- Cache records are user-scoped and cleared before sign-out.
- Closed roll-call caches are invalidated.
- Archived group/event screens do not download a roster.
- Atomic roster replacement removes memberships no longer present in the server snapshot.
- SQLite schema changes use `PRAGMA user_version` migrations.
- An integrity failure deletes only this derived cache and recreates it; hosted data is unchanged.
- A stale or missing cache is never presented as ready for offline use.
