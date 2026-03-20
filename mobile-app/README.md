# EdisonPay Mobile App (Android APK / iOS)

This is a real installable mobile app built with React Native (Expo + EAS), not a PWA and not a browser extension.

## 1) Configure environment

Copy `.env.example` to `.env` in this `mobile-app` folder, then set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE` (your deployed backend URL, e.g. `https://your-domain.com`)

Important:
- For physical phones, do not use `localhost`.
- Use a reachable HTTPS backend URL.

## 2) Install dependencies

```bash
npm install
```

## 3) Run locally for development

```bash
npx expo start
```

- Press `a` for Android emulator.
- Or scan QR from Expo Go for quick testing.

## 4) Build a real APK (installable app)

Login first:

```bash
npx eas-cli login
```

Build APK:

```bash
npx eas-cli build -p android --profile preview
```

After build completes, download the generated `.apk` from the EAS build URL and install it on Android.

## 5) Build production Android App Bundle (Play Store)

```bash
npx eas-cli build -p android --profile production
```

## 6) iOS build (optional)

```bash
npx eas-cli build -p ios --profile production
```

Requires Apple developer setup.

## What is included

- Native app icon + splash screen
- Secure auth session storage (Expo Secure Store)
- Live Supabase data sync + real-time subscriptions
- Reconnecting banner when network is lost
- Bottom navigation: Home, Earnings, Wallet, Profile
- Wallet actions wired to backend/Supabase RPC
