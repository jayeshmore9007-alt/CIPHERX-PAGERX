# Installing CIPHERX AI on an Android Phone - v0.7.0

You do not need coding experience for this. Follow the steps in order.

## Step 1: Get the APK
After a build (see docs/BUILD.md), you receive a download link ending in
`.apk`. Download it on the phone, or download on a computer and copy the file
to the phone (USB cable, email, or Drive).

## Step 2: Allow installation
Android blocks apps from outside the Play Store by default:
1. Open **Settings -> Apps -> Special access -> Install unknown apps**
   (location varies slightly by phone brand).
2. Allow your browser (or file manager) to install unknown apps.

## Step 3: Install
1. Tap the APK file in your browser's Downloads or your file manager.
2. Tap **Install**. If Android warns about an unsigned/new app, that is
   normal for a self-built APK - confirm **Install anyway**.
3. Open the app. You should see the CIPHERX CORE dashboard.

## Step 4: Connect to your backend
1. Tap **Settings**.
2. In "Backend gateway", enter your server URL:
   - Phone and computer on the same Wi-Fi: `http://<your-computer-LAN-IP>:8080`
   - Cloud deployment: `https://<your-app>.up.railway.app` (or similar)
3. Tap **Save gateway URL**. The status dot should show CONNECTED.
4. Sign in with the operator username/password from your backend `.env`.

## Step 5: First analysis (example)
1. **Projects** -> create a project.
2. Upload an APK **you own or are authorized to test** -> confirm the
   authorization dialog.
3. Tap **Run full analysis**, then watch **Jobs** for live step updates.
4. Return to **Projects** and open the HTML or PDF report.

## Troubleshooting
| Problem | Fix |
|---|---|
| Status shows DISCONNECTED | Wrong URL, or backend not running; check `http://.../api/health` in the phone browser |
| Upload rejected | Wrong file type or corrupted file - only APK/AAB/DEX/JAR/ZIP/SO pass validation |
| Agents show TOOL_NOT_INSTALLED | Install the listed tool on the server (hint shown on the RELAB screen) |
| Commands rejected 403 | PAGER-X only allows: status, uptime, ifconfig, df -h, log tail |
| App icon is blank | The app ships without brand images; add icons in `app/assets/` before building |
