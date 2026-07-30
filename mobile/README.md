# Haajar Mobile

The Android-first Haajar mobile application, built with React Native, Expo,
TypeScript, Expo Router, and HeroUI Native. It is currently a navigation-only
foundation with mock content and no backend integration.

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
