# PAGER-X Android Commander

This adds a first safe step toward controlling an owned Hak5 WiFi Pineapple Pager from the CIPHERX Android app.

## Architecture

Android app -> authenticated CIPHERX backend -> Pager device manager -> enrolled Pager.

Do not connect the mobile UI directly to SSH. Keep device credentials and SSH key material on the backend host, not in the APK. Use a private trusted network/VPN and verify the device host key before enabling SSH.

## Commander API

All routes require the existing `x-cipherx-session` authentication header.

- `GET /api/pagerx/commander/capabilities` — lists supported and unavailable operations.
- `POST /api/pagerx/commander/message` — JSON body: `{"deviceId":"...","message":"check device status"}`.

The intent router recognizes a small set of natural-language read-only requests: connection health, basic status, uptime, network interfaces, storage, and recent logs. It maps those requests to the existing `deviceManager` hard allowlist. It never converts user text into a shell command and never executes arbitrary AI-generated commands.

## Current limitations

This commit does not claim full Pager control. Module start/stop, payload deployment/execution, wireless configuration changes, and other state-changing actions remain unavailable until the exact Pager firmware version and documented interfaces are verified. Any future state-changing action must require explicit per-action approval and be added to a narrow allowlist.

## First device setup

1. Confirm the Pager firmware version from the device's Settings / Updates screen.
2. Connect the Android phone and Pager on a private, trusted local network or a supported USB-C Ethernet arrangement.
3. Enroll only the Pager's verified local address in CIPHERX.
4. Approve the enrolled device after verifying its identity and SSH host key.
5. Configure backend-side SSH key authentication. Never paste a root password, private key, or session token into chat or commit it to Git.
6. Test connection health, then try read-only Commander intents.

The well-known Virtual Pager address shown in Hak5 setup material is commonly `http://172.16.52.1`; confirm the address on the actual device/network before using it. Do not assume this HTTP interface is itself an SSH endpoint.

## Security requirements before production

- HTTPS for remote backend access; do not expose an unauthenticated SSH or HTTP bridge to the public internet.
- Strong unique operator password and session expiry/revocation.
- SSH host-key pinning and key-based authentication.
- Restrict enrolled device addresses to the expected private/local network.
- Rate limit login and command endpoints.
- Audit every action, including denied requests.
- Keep arbitrary shell execution disabled.
