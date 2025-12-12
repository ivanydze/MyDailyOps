# App Updates Setup Guide
## Problem 20: App Updates

## ✅ Implementation Status

### Desktop (Tauri)
- ✅ Tauri Updater plugin added to Cargo.toml
- ✅ Updater plugin configured in tauri.conf.json
- ✅ Public signing key added to tauri.conf.json
- ✅ Update service created (`updateService.ts`)
- ✅ Update notification component created
- ✅ "Check for Updates" button added to Settings
- ✅ Custom Tauri commands for fallback update check
- ⏳ **TODO:** Configure update server endpoint (GitHub Releases or custom server)

### Mobile (Expo)
- ✅ Expo Updates configured in `app.json`
- ✅ Update channels configured in `eas.json` (production, preview, development)
- ✅ Update service created (`updateService.ts`)
- ⏳ **TODO:** Integrate update check UI in Settings
- ⏳ **TODO:** Set up Firebase App Distribution (requires Firebase project setup)

---

## Desktop (Tauri) - Auto-Updater Setup

### Step 1: Generate Signing Keypair ✅ COMPLETED

Tauri updater requires a signing keypair for secure updates. This has already been completed:

- ✅ Private key: Generated and stored securely (keep secret!)
- ✅ Public key: Configured in `tauri.conf.json`

### Step 2: Configure Update Server Endpoint

The `updater` plugin is configured in `tauri.conf.json` with your public signing key:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/USERNAME/REPO/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDM3MzIwNzk0M0MxNjhGM0EKUldRNmp4WThsQWN5TjVYeDd2S3dFN2Y2ZEJlNWZqQnp1T01wemZUS3luaDZFbUhQb0MxUndRYnAK"
    }
  }
}
```

**⚠️ Important:** Replace `USERNAME/REPO` in the endpoint URL with your actual GitHub repository, or configure a custom update server endpoint.

### Step 3: Set Up Update Server

#### Option A: GitHub Releases (Recommended for Start)

1. Create a GitHub release
2. Upload update files (`.msi` for Windows, `.dmg` for macOS, `.AppImage` for Linux)
3. Create `latest.json` manifest:

```json
{
  "version": "0.1.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-01-15T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/USERNAME/REPO/releases/download/v0.1.1/MyDailyOps_0.1.1_x64-setup.exe"
    }
  }
}
```

4. Sign the update using:
```bash
tauri-signer sign ~/.tauri/myapp.key path/to/update/file
```

#### Option B: Custom Update Server

Create an endpoint that returns the same JSON structure.

### Step 4: Build and Release

1. Build the app: `pnpm tauri:build`
2. Sign the installer/package
3. Upload to update server
4. Update `latest.json` manifest

---

## Mobile (Expo) - OTA Updates Setup

### Step 1: Configure expo-updates

Update `app.json`:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/1ffb584b-e0b9-409e-acbd-197dbc720227"
    }
  }
}
```

### Step 2: Set Up EAS Update

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure update channels in `eas.json`:

```json
{
  "build": {
    "production": {
      "channel": "production"
    },
    "preview": {
      "channel": "preview"
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Step 3: Firebase App Distribution

1. Create Firebase project
2. Enable App Distribution
3. Configure `eas.json`:

```json
{
  "build": {
    "production": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

4. Build with EAS: `eas build --platform android --profile production`

### Step 4: Publish OTA Updates

```bash
# Publish update to production channel
eas update --branch production --message "Bug fixes"

# Or use automated updates
eas update:auto
```

---

## Testing Updates

### Desktop
1. Build current version: `pnpm tauri:build`
2. Install and run
3. Build new version with incremented version
4. Upload to update server
5. Check for updates in app

### Mobile
1. Build APK: `eas build --platform android --profile production`
2. Distribute via Firebase App Distribution
3. Publish OTA update: `eas update --branch production`
4. Test update flow

---

## Notes

- **Desktop:** Updates require proper signing. Keep private key secure.
- **Mobile:** OTA updates only work for JavaScript/asset changes. Native changes require new build.
- **Version Management:** Always increment version numbers for new releases.
- **Rollback:** Keep previous versions available for rollback if needed.

