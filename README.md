# Required App Assets

Before running a production EAS build, place real images here:

| File | Purpose | Recommended size |
|---|---|---|
| `icon.png` | App icon | 1024 x 1024, PNG, no transparency |
| `adaptive-icon.png` | Android adaptive icon foreground | 1024 x 1024, PNG |
| `adaptive-icon-background.png` | Android adaptive icon background (pure black `#000000` works) | 1024 x 1024 |
| `splash.png` | Splash screen image | 1284 x 2778 or similar portrait PNG |
| `splash-icon.png` | Centered splash logo | 512 x 512, PNG |

Suggested style: pure black background with the neon green (#00FF9C) and cyan (#38E8FF) CIPHERX motif.

Without these files, EAS still builds but ships default Expo assets. Generate them with any image editor, or with Expo's tools (https://docs.expo.dev/develop/user-interface/splash-screen/ and app-icons).
