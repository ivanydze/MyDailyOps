# Problem 20: App Updates - Implementation Plan

## Overview
Реализация автоматических обновлений для Desktop (Tauri) и Mobile (Expo) приложений.

## Desktop (Tauri) - Auto-Updater

### Requirements
- Tauri Auto-Updater plugin
- Update server endpoint
- Update manifest (JSON)
- UI для уведомлений и процесса обновления

### Implementation Steps

#### Phase 1: Configure Tauri Auto-Updater
1. Add `tauri-plugin-updater` dependency to Cargo.toml
2. Configure updater in `tauri.conf.json`
3. Set up update server endpoint (can use GitHub Releases, custom server, or Tauri's update server)
4. Generate signing keypair for update signatures

#### Phase 2: Implement Update Check and UI
1. Create update service/hook in TypeScript
2. Add update check on app start
3. Add periodic update check
4. Create UI components:
   - Update available notification
   - Update progress dialog
   - Manual "Check for Updates" button in Settings

#### Phase 3: Update Server Setup
1. Choose update server (GitHub Releases recommended for start)
2. Configure update manifest generation
3. Set up signing keys
4. Document update release process

---

## Mobile (Expo) - Firebase App Distribution + OTA Updates

### Requirements
- Firebase App Distribution для начальной установки APK
- Expo Updates (OTA) для обновлений без переустановки
- EAS Build configuration

### Implementation Steps

#### Phase 4: Firebase App Distribution Setup
1. Create Firebase project (if not exists)
2. Set up App Distribution in Firebase Console
3. Configure `eas.json` for App Distribution
4. Add Firebase App Distribution plugin to EAS
5. Set up CI/CD for automatic distribution

#### Phase 5: Expo Updates (OTA) Configuration
1. Configure `expo-updates` in `app.json`
2. Set up update channel strategy
3. Implement update check logic
4. Add update UI components
5. Configure EAS Update

#### Phase 6: Testing & Documentation
1. Test update flow for Desktop
2. Test update flow for Mobile
3. Document release process
4. Document update distribution workflow

---

## File Structure

### Desktop
```
apps/desktop/
├── src-tauri/
│   ├── Cargo.toml (add tauri-plugin-updater)
│   └── tauri.conf.json (updater config)
└── src/
    ├── services/
    │   └── updateService.ts (update logic)
    └── components/
        └── UpdateNotification.tsx
```

### Mobile
```
apps/mobile/
├── app.json (expo-updates config)
├── eas.json (update channels, app distribution)
└── src/
    └── services/
        └── updateService.ts (OTA update logic)
```

---

## Notes

- **Desktop:** Tauri Auto-Updater requires signed updates. Can use GitHub Releases as update server initially.
- **Mobile:** Expo Updates already installed (`expo-updates@~29.0.14`), need to configure it.
- **Security:** Both require proper signing and verification.
- **Rollback:** Both platforms should support rollback to previous versions if needed.


