# Haajar Mobile

The Android-first Haajar mobile application, built with React Native, Expo,
TypeScript, Expo Router, and HeroUI Native. Authentication and profile setup use
Supabase; event, group, and attendance screens still use local mock data.

The project is preconfigured with
[HeroUI Native](https://heroui.com/docs/native), [Uniwind](https://docs.uniwind.dev)
(Tailwind CSS for React Native), and [Expo Router](https://docs.expo.dev/router/introduction)
with a bottom-tab layout.

## Run locally

Prerequisites:

- Node.js and npm
- Android Studio with an Android virtual device, or a physical Android device

From the repository root:

1. Install dependencies

   ```bash
   cd mobile
   npm install
   ```

2. Start the app

   Copy the public Supabase environment template and fill it with the API values
   from Supabase Dashboard → Project Settings → API:

   ```bash
   cp .env.example .env
   ```

   ```bash
   npm run start
   ```

Start an Android emulator in Android Studio, then press `a` in the Expo terminal
to open Haajar. The computer's Android SDK tools must be available to Expo.

Useful validation commands:

```bash
npm run typecheck
npm run lint
npm run format:check
```

Routes live in `src/app`, shared components in `src/components`, and
domain-oriented code in `src/features`.

## Supabase and Google sign-in

The mobile app expects:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Only the public anon key belongs in the Expo environment. Never add a Supabase
service-role key, database password, or Google client secret to the mobile app.

Before Google sign-in works:

1. Create a Google OAuth web client.
2. In Google Cloud, add Supabase's callback URL:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Enable Google under Supabase Dashboard → Authentication → Providers and add
   the Google client ID and secret there.
4. Under Authentication → URL Configuration, add
   `haajar://auth/callback` to the redirect allow list.
5. Apply `../supabase/migrations/` to the linked Supabase project.

Sessions are persisted in Expo SecureStore. The app uses the `haajar` scheme and
the OAuth callback `haajar://auth/callback`.

### Regenerate database types

After applying database migrations, authenticate the Supabase CLI and regenerate
the types from the hosted `public` schema:

```bash
npx supabase login
npx supabase gen types typescript --project-id idhxgezjoxgbfjckngzp --schema public > src/types/database.types.ts
npx prettier --write src/types/database.types.ts
```

The generated file contains table row, insert and update shapes, relationships,
views, functions, enums and composite types. It must not be edited by hand.

## What's preconfigured

- **HeroUI Native** (`heroui-native`) wrapped in `HeroUINativeProvider` and `GestureHandlerRootView` in `src/app/_layout.tsx`
- **Uniwind** + **Tailwind CSS** wired through `metro.config.js` and `src/global.css`
- All HeroUI Native mandatory peer dependencies
- `@gorhom/bottom-sheet` for bottom-sheet UIs
- `@expo/vector-icons` (Ionicons) for tab bar icons
- TypeScript with `strict: true` and `@/*` path alias to `./src/*`
- React Compiler enabled

## Learn more

- [HeroUI Native components](https://heroui.com/docs/native) — full component reference
- [Expo documentation](https://docs.expo.dev/) — Expo fundamentals and guides
- [Uniwind documentation](https://docs.uniwind.dev) — Tailwind for React Native
- [Expo Router](https://docs.expo.dev/router/introduction) — file-based routing
