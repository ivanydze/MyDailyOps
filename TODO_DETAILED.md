# TODO.md (Multi-Platform) — Detailed Task List

## Phase 1 — Desktop (Current)

### Polish & Enhancement (60% Complete)
- [ ] **Category dropdown** - Similar to priority, with preset + custom options
- [ ] **Search clear button** - X icon to clear search field
- [ ] **Persist filter preference** - Save to config.json or SQLite
- [ ] **Dark mode** - MD3 dark theme with toggle
- [ ] **Performance test (50 tasks)** - Load testing and optimization
- [ ] **SQLite offline cache** - Local database mirror
- [ ] **Python Sync Engine** - Background sync service

---

## Phase 2 — Mobile (Expo)

### Project Setup (0%)
- [ ] **Expo project init** - `npx create-expo-app`
- [ ] **TypeScript setup** - tsconfig.json
- [ ] **Folder structure** - src/, components/, screens/
- [ ] **Dependencies** - Supabase, SQLite, Navigation
- [ ] **Theme system** - React Navigation Theme + colors

### Supabase Integration (0%)
- [ ] **Supabase client** - @supabase/supabase-js
- [ ] **Auth hooks** - useAuth, useSession
- [ ] **Database hooks** - useTasks, useQuery
- [ ] **Error handling** - Toast/snackbar notifications

### Local Storage (0%)
- [ ] **SQLite setup** - expo-sqlite
- [ ] **Cache schema** - Mirror of Supabase tables
- [ ] **CRUD operations** - Create, read, update, delete
- [ ] **Migration system** - Schema versioning

### Core Screens (0%)
- [ ] **Login screen** - Email/password with validation
- [ ] **Tasks list screen** - FlatList with grouping
- [ ] **Add task screen** - Form with pickers
- [ ] **Edit task screen** - Pre-filled form
- [ ] **Task details** - Full view with actions
- [ ] **Settings screen** - Theme, sync, account

### Mobile Features (0%)
- [ ] **Swipe gestures** - Mark done, delete
- [ ] **Pull-to-refresh** - Reload tasks
- [ ] **Bottom sheet** - Quick actions
- [ ] **Date picker** - Native date picker
- [ ] **Time picker** - Native time picker
- [ ] **Priority selector** - Bottom sheet or modal

### Notifications (0%)
- [ ] **Push notifications** - Expo Notifications
- [ ] **Local notifications** - Deadline reminders
- [ ] **Notification permissions** - Request on first launch
- [ ] **Notification settings** - Enable/disable per category

### Sync (0%)
- [ ] **TS Sync Engine** - TypeScript version
- [ ] **Background fetch** - Periodic sync
- [ ] **Sync indicators** - UI feedback
- [ ] **Offline queue** - Pending operations

---

## Phase 3 — Sync Engine

### Core Sync Logic (0%)
- [ ] **Bidirectional sync** - Desktop ↔ Cloud ↔ Mobile
- [ ] **Pull changes** - Fetch updates since last_sync
- [ ] **Push changes** - Upload local modifications
- [ ] **Delta sync** - Only changed records

### Conflict Resolution (0%)
- [ ] **Timestamp comparison** - Latest wins
- [ ] **Conflict detection** - Identify simultaneous edits
- [ ] **Manual resolution UI** - User chooses version
- [ ] **Conflict logs** - Track resolution history

### Queue Management (0%)
- [ ] **Sync queue** - FIFO operation queue
- [ ] **Retry logic** - Exponential backoff
- [ ] **Failed operations** - Error handling
- [ ] **Queue persistence** - Survive app restart

### Realtime (0%)
- [ ] **Realtime subscriptions** - Supabase Realtime
- [ ] **Live updates** - Instant UI refresh
- [ ] **Presence** - See who's online (future)
- [ ] **Broadcasting** - Notify other devices

### Background Sync (0%)
- [ ] **Background service** (Mobile) - iOS/Android workers
- [ ] **Sync intervals** - Smart scheduling
- [ ] **Battery optimization** - Respect power mode
- [ ] **Network awareness** - WiFi vs cellular

---

## Phase 4 — Advanced Features

### Desktop Advanced (0%)
- [ ] **Drag & drop reorder** - Kivy DragBehavior
- [ ] **Task templates** - Reusable task structures
- [ ] **Categories filter** - Multi-select categories
- [ ] **Export tasks** - JSON, CSV, TXT formats
- [ ] **System tray agent** - Background app with icon
- [ ] **Keyboard shortcuts** - Customizable hotkeys
- [ ] **Bulk operations** - Select multiple, batch actions
- [ ] **Task archiving** - Archive old completed tasks

### Mobile Advanced (0%)
- [ ] **Widgets** - Home screen widgets
- [ ] **Siri Shortcuts** - Voice commands
- [ ] **Share extension** - Add tasks from other apps
- [ ] **Quick add** - 3D Touch / long-press
- [ ] **Location reminders** - Geofencing
- [ ] **Calendar integration** - Sync with native calendar

### Cross-Platform Features (0%)
- [ ] **Recurring tasks** - Daily, weekly, monthly patterns
- [ ] **Sub-tasks / Checklists** - Nested task items
- [ ] **File attachments** - Supabase Storage integration
- [ ] **Task comments** - Discussion threads
- [ ] **Task sharing** - Share with other users
- [ ] **Collaboration** - Multi-user tasks
- [ ] **Analytics dashboard** - Charts, stats, insights
- [ ] **Time tracking** - Pomodoro timer, time logs
- [ ] **Tags system** - Flexible categorization
- [ ] **Custom fields** - User-defined metadata
- [ ] **API access** - REST API for integrations
- [ ] **Webhooks** - Trigger external services

---

## 🎯 Priority Order

### Week 1-2: Complete Phase 1
1. Category dropdown
2. Search clear button
3. Dark mode
4. Performance testing

### Week 3-4: Offline Mode
1. SQLite cache
2. Basic sync engine
3. Offline indicators

### Month 2: Mobile App
1. Expo setup
2. Core screens
3. Supabase integration
4. Basic sync

### Month 3: Sync Engine
1. Bidirectional sync
2. Conflict resolution
3. Realtime updates

### Month 4+: Advanced Features
1. User feedback-driven priorities
2. Most-requested features first
3. Performance optimizations

---

## 📊 Estimated Effort

| Phase | Tasks | Estimated Time | Complexity |
|-------|-------|----------------|------------|
| Phase 1 Core | 20 | ✅ Complete | Medium |
| Phase 1 Polish | 7 | 1-2 weeks | Low |
| Phase 2 Mobile | 25 | 3-4 weeks | High |
| Phase 3 Sync | 15 | 2-3 weeks | Very High |
| Phase 4 Advanced | 30+ | Ongoing | Varies |

---

**Last Updated:** December 3, 2025  
**Current Phase:** Phase 1 Desktop (95% complete)  
**Next Milestone:** Complete Phase 1 Polish, begin SQLite cache

