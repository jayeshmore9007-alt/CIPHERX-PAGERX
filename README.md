# CIPHERX UNFILTERED AI

Android Expo / React Native project with a cyberpunk chat interface and a defensive-security information screen.

## Build an Android APK with GitHub Actions

1. Open the **Actions** tab in this repository.
2. Select **Build Android APK**.
3. Press **Run workflow** on the `main` branch.
4. When the run finishes successfully, open the run and download the `CIPHERX-UNFILTERED-AI-debug-apk` artifact.
5. Extract the downloaded ZIP to get `app-debug.apk`.

The workflow also runs automatically on pushes to `main`.

## Project layout

- `app/`: Expo React Native Android application.
- `backend/`: Express API adapter for a separately running Ollama server.
- `docs/IMPLEMENTATION-STATUS.md`: implemented features and known limitations.

## Important implementation notes

This uploaded source is a starter implementation. The chat UI calls the configured backend. The backend forwards requests to an Ollama server at the configured URL (default `http://127.0.0.1:11434`). Ollama is **not bundled** in the APK.

The Security Lab cards are informational placeholders; they do not run Wi-Fi scans, device inventory, vulnerability scans, or malware analysis. Online AI provider integration and embedded on-device offline model inference are not implemented yet. The LiteRT package is present as a dependency/plugin, but no model is bundled or loaded by the app.

Use the app only for lawful defensive security work on systems you own or are authorized to assess. Do not expose the starter backend publicly without authentication, TLS, rate limiting, and production hardening.

## Local backend

```bash
cd backend
npm install
npm start
```

Environment variables:
- `PORT` (default `3000`)
- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default `llama3.2`)

Never commit API keys, tokens, or `.env` files.
