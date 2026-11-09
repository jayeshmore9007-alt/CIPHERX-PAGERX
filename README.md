# CIPHERX AI / PAGER-X

The main Android application source is in the repository root:
- `App.tsx` and `src/`: Expo React Native application and screens.
- `app.json` and `eas.json`: Expo app identity and APK build profiles.
- `backend/`: Node.js API, model gateway, PAGER-X services, and tests.
- `docs/`, `BUILD.md`, and `INSTALL-ANDROID.md`: project and build documentation.

## Build an Android APK on GitHub

The GitHub Actions workflow **CIPHERX Android APK** builds the main root project without requiring an Expo access token:

1. Open the repository's **Actions** tab.
2. Select **CIPHERX Android APK**.
3. Open the latest run and wait for the Android build to finish.
4. Download the artifact named `CIPHERX-PAGERX-debug-apk`.
5. Extract the downloaded ZIP and install `app-debug.apk` on Android.

The workflow runs on pushes to `main` and can also be started manually with **Run workflow**.

## Build approach

GitHub Actions installs the root project dependencies, runs the backend tests, generates the Android native project with Expo prebuild, builds a debug APK with Gradle, and uploads the APK as a workflow artifact. This is a debug-signed installable APK for testing; a production release should use a protected release-signing key.

## Security and configuration

Configure the backend's operator password and provider settings using environment variables or a private `.env` file on the backend host. Never commit passwords, API keys, tokens, keystores, or private environment files.

Only use the security analysis features on devices, files, and systems you own or are explicitly authorized to assess. Review the implementation status and deployment notes before exposing the backend to a public network.

## Note about the uploaded starter ZIP

The separately uploaded `CIPHERX-UNFILTERED-AI.zip` contains a small standalone starter app. It is not the full root CIPHERX-PAGER-X source tree, so it is intentionally not copied over the existing main project.
