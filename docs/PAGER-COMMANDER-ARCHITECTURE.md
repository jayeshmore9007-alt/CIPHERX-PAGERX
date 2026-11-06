# PAGERX Commander — Android integration plan

## Goal
Add a dedicated Android control surface for the Hak5 WiFi Pineapple Pager, integrated into CIPHERX. This is a defensive, owner-operated controller for device status, official Virtual Pager access, approved diagnostics, audit history, and safe payload inventory/management.

## Important product distinction
The Hak5 WiFi Pineapple Pager is not the Mark VII. It does not expose the Mark VII module-based web UI. Hak5 documents the Pager as Linux-based with root access, Bash, DuckyScript payloads, a browser-based Virtual Pager, and a web terminal. The app must not assume Mark VII endpoints or invent a REST API.

## Connection model
1. Android connects to the Pager over USB-C Ethernet when the Android device exposes the USB Ethernet interface, or over a trusted local Wi-Fi path where supported.
2. The user enters the Pager address after confirming it from their device/network settings. Do not hard-code the first-boot setup address as a universal management URL.
3. The app opens the verified Virtual Pager URL in an authenticated browser session or embedded WebView after validating TLS/origin policy.
4. SSH is a separate, optional capability. Credentials remain on-device in Android Keystore-backed secure storage; never place them in source code, GitHub, logs, analytics, or AI prompts.
5. All network calls are local by default. Remote access is disabled unless the owner deliberately configures a VPN/private tunnel.

## Initial release scope
- Connection profile: host, port, scheme, connection type, last-known status.
- Connection test: bounded HTTP reachability check against an owner-entered URL; display status and response timing only.
- Virtual Pager: launch the Pager's official Virtual Pager UI in a secure WebView/browser. No screen scraping or undocumented endpoint dependency.
- AI Commander: convert natural-language requests into a small, typed set of supported actions. AI may explain status and propose steps; it cannot emit arbitrary shell commands.
- Safe diagnostics: read-only device reachability, user-triggered status checks, app-side connection logs, and user-visible audit trail.
- Payload inventory: display/import/export user-owned payload files only after the Pager's supported interface is verified. Do not run payloads automatically.
- Explicit confirmation for state-changing actions; deny destructive commands, firmware changes, credential extraction, deauthentication, rogue AP, MITM, handshake capture, or attacks against third-party networks.

## Technical boundaries
- The current repository inventory mentions an existing PagerX screen and a backend device manager. Inspect and extend those implementations before adding duplicate navigation or device APIs.
- Do not assume Expo Go can access raw USB Ethernet interfaces. Android networking is handled by the OS; validate on the user's exact phone/Android build and a data-capable USB-C cable.
- Never expose SSH/root credentials to the backend or AI model. Any future SSH bridge must run locally on the Android device or use a narrowly scoped owner-managed relay, with pinned host key and typed allow-listed operations only.
- Do not store tokens/passwords in AsyncStorage, plain files, source, GitHub Actions logs, or telemetry.
- No arbitrary shell, command composition, or user-supplied command execution from AI.
- Use official Hak5 firmware only and require the user to run firmware updates using Hak5's documented process.

## Verification checklist
- Confirm Pager firmware version from Settings > Updates.
- Confirm the device's actual USB Ethernet or trusted Wi-Fi address.
- Confirm Android exposes the USB Ethernet route and can reach the verified device URL.
- Verify the Virtual Pager UI manually before building any embedded UI or supported action adapter.
- Test offline, wrong-host, certificate warning, auth failure, timeout, and reconnection states.
- Unit-test AI intent parsing against the typed allow-list and rejection cases.
