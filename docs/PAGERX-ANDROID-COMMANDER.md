# PAGER-X Android Commander

This is the Android companion foundation for an owned Hak5 WiFi Pineapple Pager.

## Verified device facts

- The Pager exposes a USB-C Ethernet interface for host connectivity.
- Hak5 documents the initial USB setup page at `http://172.16.52.1`.
- The Pager supports SSH root access when connected to its network.
- Virtual Pager provides browser-based screen/button interaction, a web terminal, and remote loot downloads.
- Pager payloads are device-specific DuckyScript plus Bash; this is not the Mark VII module API.
- The official Pager payload repository warns that payloads may execute with device-level privileges and are supplied as-is.

Sources:
- Hak5 setup: https://shop.hak5.org/pages/pager-setup
- Hak5 Pager documentation: https://docs.hak5.org/wifi-pineapple-pager/wifi-pineapple-pager-by-hak5/
- Hak5 Pager payloads: https://github.com/hak5/wifipineapplepager-payloads
- Hak5 Pager product/FAQ: https://shop.hak5.org/products/pager

## Architecture

Android app -> authenticated CIPHERX backend -> enrolled Pager over SSH.

For visual control, the Android app can open the Pager's own Virtual Pager page in the phone browser. The phone must be connected to the Pager's management network or a supported USB-C Ethernet path. The app uses the enrolled private IPv4 address as the browser destination; verify the actual address on the device/network. The documented `172.16.52.1` is the initial USB setup address, not a guarantee that every management configuration uses the same address or route.

For SSH diagnostics, the CIPHERX backend must be running on a machine that can route to the Pager's private address. A cloud-hosted backend normally cannot reach a Pager on the phone's local USB/Wi-Fi network unless a deliberately configured private VPN/tunnel connects them. Do not expose the Pager's SSH service to the public internet.

## Commander API

All routes require the existing `x-cipherx-session` authentication header.

- `GET /api/pagerx/commander/capabilities` — lists supported and unavailable operations.
- `POST /api/pagerx/commander/message` — JSON body: `{"deviceId":"...","message":"check device status"}`.

The intent router maps a small set of English/Marathi natural-language diagnostics to fixed commands only:
- connection health
- basic system identity
- uptime
- network interfaces
- filesystem capacity
- recent bounded logs

It never converts user text into shell code and never executes arbitrary AI-generated commands.

## Device enrollment and SSH trust

1. Connect the phone and Pager to the same private management network, or connect a backend host to the Pager's USB-C Ethernet interface.
2. Verify the Pager's actual private IPv4 address. Do not assume the initial setup address is still in use.
3. Enroll the device in CIPHERX. The backend accepts only private IPv4 addresses and sets the device to `PENDING`.
4. On the backend host, obtain the SSH host key using `ssh-keyscan` only as a collection step. Verify its fingerprint against the Pager/device information through a trusted local channel before trusting it.
5. Add the verified host key to a dedicated known-hosts file. Set `PAGERX_KNOWN_HOSTS_FILE=/absolute/path/to/pager_known_hosts`.
6. If using a dedicated SSH key, set `PAGERX_SSH_KEY_PATH=/absolute/path/to/private_key`. Keep the private key on the backend host; never put it in the APK, repository, or chat.
7. Approve the enrolled device in the app only after identity and host-key verification.
8. Test connection health, then try a read-only Commander diagnostic.

SSH is configured with `StrictHostKeyChecking=yes`, password authentication disabled, and a dedicated known-hosts file. If the host key is missing or changed, the connection fails closed.

## Current implementation limits

This branch is a safe integration foundation, not yet full hardware control:
- Browser-based Virtual Pager access is delegated to Hak5's own web interface.
- SSH supports only fixed read-only diagnostics.
- Module control, payload installation/execution, wireless state changes, file transfer, firmware updates, and loot downloads are not yet wired into Commander.
- Do not infer Mark VII API compatibility. Pager uses its own Virtual Pager and DuckyScript/Bash payload ecosystem.

Future state-changing operations must be implemented only against documented Pager interfaces, limited to the user's own device and authorized test networks, with per-action confirmation, audit logging, rollback guidance where possible, and a hard allowlist. Do not add deauthentication, rogue AP, credential capture, interception, or exfiltration automation.

## Tests

Run `npm test` from the backend repository root. The tests cover intent routing boundaries and private-address validation. Hardware connectivity still requires an actual Pager and a backend host on the same reachable private network.
