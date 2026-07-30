# Deployment

## Environments

Use separate Supabase projects where possible:

- Development
- Staging
- Production

At minimum, use separate schemas or strict environment variables.

## Android configuration

Define a stable package identifier before OAuth setup.

Example:

```text
app.haajar.mobile
```

Configure:

- Expo scheme: `haajar`
- Deep-link callback: `haajar://auth/callback`
- Camera permission
- Notification permission
- Android app name and icon

## Build methods

### EAS

```bash
eas build --platform android --profile preview
```

Generate an APK for direct installation.

### Local Gradle

```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```

## GitHub Release flow

1. Create release build.
2. Test the exact APK.
3. Create GitHub Release.
4. Upload APK.
5. Add checksum.
6. Add installation instructions.
7. Generate QR linking to the release page.
8. Share through WhatsApp.

## Release checklist

- Correct Supabase environment
- OAuth deep link tested
- No service-role key
- RLS enabled
- Camera permission works
- Notifications work
- Offline roster works
- Pending queue survives restart
- CSV export works
- Version displayed
- Privacy notice included
- APK checksum published

## Versioning

Use semantic versioning:

```text
0.1.0 — first internal prototype
0.2.0 — group and registration flow
0.3.0 — QR attendance
0.4.0 — realtime and notifications
0.5.0 — offline fallback
1.0.0 — first stable IV release
```
