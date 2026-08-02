# QR privacy production checklist

Run this checklist on a physical Android device using a release or internal-distribution build.
Expo Go is not a valid privacy test environment.

## Sensitive screens

For **My Group QR** and **Invite Members → generated invitation**:

1. Open the sensitive screen and attempt Power + Volume Down. Android must report that screenshots
   are blocked or produce no usable image.
2. Open Android Recents. The Haajar card must be blank/secured and must not show the QR, join code,
   or deep link.
3. Return to Haajar. My Group QR may securely reload; a generated invitation must be cleared and
   require generating a new invitation.
4. Navigate back to an ordinary screen and take a screenshot. Normal screenshot behaviour must be
   restored.
5. Open My Group QR and use **Share QR** and **Save QR**. Both explicit app-generated images must
   remain usable even though system screenshots are blocked.
6. After sharing/saving, background the app and verify no temporary QR image is visible in Recents.

## Production configuration audit

- `android.allowBackup` is false so the SQLite attendance cache is excluded from Android backup.
- Release builds use Hermes production bundling. No release `debuggable` flag or cleartext-traffic
  override is configured; cleartext traffic exists only in generated debug manifests.
- Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` belong in the mobile build.
  Service-role keys, database passwords, OAuth secrets, worker secrets, and signing material must
  remain in hosted secret stores.
- Source maps must be treated as private build artifacts if uploaded to a crash-reporting service.
  Do not publish them with public release downloads.
- Camera, notification, photo-save, and secure-storage permissions are feature-scoped. Microphone,
  audio-library, and video-library permissions are explicitly blocked. Screenshot
  detection permissions are not requested because `FLAG_SECURE` does not require them.
- Release technical logging is disabled by `__DEV__`; development logs redact QR credentials,
  invitation routes, JWTs, and 64-character secrets.
- Sign-out clears all TanStack queries and mutations, SQLite attendance data, push registration,
  ephemeral invitation state, and QR render state.
- OAuth and notification destinations continue through the internal-route allowlists; absolute,
  protocol-relative, custom-scheme, malformed, and traversal routes remain rejected.

Before release, run tracked-secret scanning and inspect the final merged Android manifest with
`npx expo config --type public` and the release build tooling.
