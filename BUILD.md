# Android APK Build Guide - v0.7.0

The app builds **APK** files (not AAB) in all three EAS profiles, per project
policy.

## Prerequisites (no coding experience needed)
1. A free Expo account: https://expo.dev/signup
2. Node.js 20+ installed on your computer
3. For cloud builds: only the Expo account. For local builds: Android SDK
   (Android Studio) + JDK 17.

## One-time setup
```bash
# 1. Install Expo CLI and EAS CLI
npm install -g eas-cli

# 2. Log in
eas login

# 3. Get a token for CI (used as GitHub secret EXPO_TOKEN)
eas whoami
```
Open https://expo.dev/accounts/<your-username>/settings/tokens and create an
access token for GitHub Actions.

## App icons (required before building)
Place these three images in `app/assets/` (see `app/assets/README.md`):
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024, Android adaptive icon)
- `splash.png` (recommended 1284x2778)

The build fails without them.

## Build profiles (all `android.buildType: "apk"`)
| Profile | Purpose | Command |
|---|---|---|
| development | Local dev device install | `eas build -p android --profile development` |
| preview | Internal testing APK | `eas build -p android --profile preview` |
| production | Release APK | `eas build -p android --profile production` |

Run all commands from the `app/` directory after `npm install`.

## GitHub Actions (recommended, fully wired)
1. Push this repository to GitHub.
2. In the repo settings, add a secret named `EXPO_TOKEN` with your Expo token.
3. The workflow `.github/workflows/android-apk.yml` runs the backend tests
   first and then builds the production APK automatically.
4. Download the finished APK from the Actions build log link (EAS hosts it).

## Local build (optional, needs Android Studio)
```bash
cd app
npm install
npx expo run:android          # debug run on a connected device/emulator
eas build -p android --profile production --local
```

## Verification checklist
- `cd backend && npm install && npm test` passes (7 suites).
- `cd app && npx tsc --noEmit` passes (TypeScript check).
- EAS build completes and produces an `.apk` download link.
- Install the APK, open Settings, set your backend URL, sign in, and confirm
  the Dashboard shows real health and tool status.
