# ARCHITECTURE.md

## MyDailyOps — Cross-Platform Architecture (Desktop + Mobile + Cloud)

### 1. Overview

MyDailyOps is a **multi-platform task management system** combining:

* Desktop App (KivyMD / Python)
* Mobile App (Expo / React Native)
* Supabase Backend
* Offline SQLite Cache
* Sync Engine

### 2. Components

* **Desktop:** KivyMD, SQLite, Sync Engine
* **Mobile:** Expo, SQLite, Sync Engine
* **Cloud:** Supabase (Auth, DB, Realtime)

### 3. Data Flow

```
Desktop ⇆ Local Cache ⇆ Sync Engine ⇆ Supabase ⇆ Sync Engine ⇆ Local Cache ⇆ Mobile
```

### 4. Sync

* Pull remote changes
* Push offline updates
* Conflict resolution via timestamps

### 5. Tables

* **tasks** - Main task data
* **categories** - Task categories
* **user_settings** - User preferences
* **sync_log** - Sync history tracking

### 6. Offline

* **tasks_cache** - Local SQLite mirror
* **pending_updates** - Queue for offline changes

### 7. Sync Strategy

* **Pull** → **Merge** → **Push** → **Resolve**

---

## 📐 Detailed Architecture

### Desktop App (Current - KivyMD)

**Stack:**
- Python 3.10+
- KivyMD 2.0.1.dev0 (Material Design 3)
- SQLite for local cache
- Supabase client

**Structure:**
```
app/
├── screens/          # UI screens
├── widgets/          # Reusable components
├── utils/            # Helper functions
├── supabase/         # Backend client
├── database/         # SQLite cache (to implement)
└── sync/             # Sync engine (to implement)
```

### Mobile App (Planned - Expo)

**Stack:**
- React Native (Expo)
- React Navigation
- AsyncStorage
- Supabase client
- SQLite

**Structure:**
```
mobile/
├── src/
│   ├── screens/      # UI screens
│   ├── components/   # Reusable components
│   ├── utils/        # Helper functions
│   ├── services/     # API & sync
│   └── database/     # SQLite cache
```

### Backend (Supabase)

**Services:**
- **Auth:** Email/password authentication
- **Database:** PostgreSQL with Row Level Security
- **Realtime:** Live updates (future)
- **Storage:** File attachments (future)

**Tables Schema:**

```sql
-- tasks table (existing)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  deadline TIMESTAMP,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT CHECK (status IN ('new', 'done')),
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,
  -- Sync fields
  synced_at TIMESTAMP,
  sync_version INTEGER DEFAULT 1
);

-- categories table (planned)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- user_settings table (planned)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  theme TEXT DEFAULT 'light',
  default_priority TEXT DEFAULT 'medium',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  last_sync TIMESTAMP,
  settings_json JSONB
);

-- sync_log table (planned)
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT, -- 'pull', 'push', 'conflict'
  table_name TEXT,
  record_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB
);
```

---

## 🔄 Sync Engine Design

### Local Cache (SQLite)

```sql
-- Desktop: app/database/cache.db
-- Mobile: AsyncStorage + SQLite

CREATE TABLE tasks_cache (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  deadline TEXT,
  priority TEXT,
  status TEXT,
  pinned INTEGER,
  created_at TEXT,
  updated_at TEXT,
  deleted INTEGER DEFAULT 0,
  -- Sync metadata
  synced INTEGER DEFAULT 0,
  sync_version INTEGER DEFAULT 1,
  last_modified TEXT
);

CREATE TABLE pending_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  action TEXT, -- 'create', 'update', 'delete'
  payload TEXT, -- JSON
  created_at TEXT,
  retries INTEGER DEFAULT 0
);

CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### Sync Algorithm

```python
def sync():
    """
    Main sync function
    """
    # 1. PULL: Get remote changes
    last_sync = get_last_sync_time()
    remote_updates = fetch_remote_changes(since=last_sync)
    merge_remote_to_cache(remote_updates)
    
    # 2. PUSH: Send local changes
    pending = get_pending_updates()
    for update in pending:
        try:
            push_to_remote(update)
            mark_synced(update)
        except ConflictError:
            resolve_conflict(update)
    
    # 3. UPDATE: Set last sync time
    set_last_sync_time(now())
```

### Conflict Resolution

```python
def resolve_conflict(local_update, remote_task):
    """
    Resolve sync conflicts using timestamps
    """
    if local_update.timestamp > remote_task.updated_at:
        # Local is newer, keep local
        force_push(local_update)
    else:
        # Remote is newer, keep remote
        discard_local(local_update)
        update_cache(remote_task)
```

---

## 📱 Mobile App Design (Future)

### Screens
1. **Login** - Email/password
2. **Tasks List** - Grouped by date
3. **Add Task** - Form with pickers
4. **Edit Task** - Form with pickers
5. **Task Details** - Full view
6. **Settings** - Theme, sync, notifications

### Key Features
- ✅ Offline-first architecture
- ✅ Background sync
- ✅ Push notifications
- ✅ Material Design (Android) / Cupertino (iOS)
- ✅ Gesture navigation
- ✅ Pull-to-refresh

---

## 🔐 Security

### Authentication
- Supabase JWT tokens
- Secure storage (keychain/keystore)
- Auto-refresh tokens

### Data Protection
- Row Level Security (RLS) on Supabase
- Encrypted local cache (optional)
- HTTPS only

### Privacy
- Data stored in user's Supabase project
- No third-party analytics
- GDPR compliant

---

## 🚀 Deployment Strategy

### Desktop
1. **Development:** `python main.py`
2. **Distribution:** PyInstaller → Single EXE
3. **Updates:** Manual download or auto-updater (future)

### Mobile
1. **Development:** Expo Go
2. **Distribution:** App Store / Play Store
3. **Updates:** Over-the-air (OTA) with Expo

### Backend
1. **Hosting:** Supabase Cloud
2. **Scaling:** Auto-scaling PostgreSQL
3. **Backups:** Automated daily backups

---

## 🛣️ Roadmap

### Phase 1: Core Desktop (✅ DONE)
- ✅ Basic CRUD
- ✅ Supabase integration
- ✅ Material 3 UI
- ✅ Keyboard navigation
- ✅ Date+time pickers
- ✅ Automated tests

### Phase 2: Offline Mode (🔄 NEXT)
- ⏳ SQLite local cache
- ⏳ Background sync service
- ⏳ Conflict resolution
- ⏳ Offline indicators

### Phase 3: Mobile App (📋 PLANNED)
- 📋 React Native / Expo setup
- 📋 UI components
- 📋 Sync integration
- 📋 Push notifications

### Phase 4: Advanced Features (💡 FUTURE)
- 💡 Real-time collaboration
- 💡 File attachments
- 💡 Recurring tasks
- 💡 Task templates
- 💡 Time tracking
- 💡 Analytics dashboard

---

## 📊 Performance Targets

### Desktop
- Startup: < 2 seconds
- Task load: < 500ms
- UI responsiveness: 60 FPS
- Memory usage: < 100 MB

### Mobile
- Startup: < 1 second
- Task load: < 300ms
- Offline support: 100%
- Battery efficient

### Sync
- Sync interval: 30 seconds (when online)
- Conflict resolution: < 100ms
- Retry logic: Exponential backoff
- Max retries: 3

---

## 🧪 Testing Strategy

### Desktop (Current)
- ✅ Automated integration tests
- ✅ Manual UI testing
- ⏳ Unit tests for utils
- ⏳ Performance tests

### Mobile (Future)
- 📋 Jest unit tests
- 📋 Detox E2E tests
- 📋 Manual device testing

### Backend
- ✅ Supabase RLS policies
- ⏳ API endpoint tests
- ⏳ Load testing

---

## 📝 Development Guidelines

### Code Standards
- Python: PEP8, max 100 chars
- JavaScript: ESLint, Prettier
- SQL: Lowercase keywords
- Naming: snake_case (Python), camelCase (JS)

### Git Workflow
1. Feature branches
2. Pull requests
3. Code review
4. Merge to main
5. Tag releases

### Documentation
- Update SUMMARY.md
- Update TODO.md
- Update CHANGELOG.md
- API documentation (future)

---

## 🔮 Future Considerations

### Scalability
- Pagination for large task lists
- Indexed database queries
- Lazy loading UI
- Background workers

### Extensibility
- Plugin system
- Custom themes
- API for integrations
- Webhooks

### Internationalization
- Multi-language support
- Date/time localization
- RTL layout support

---

**Last Updated:** December 3, 2025  
**Status:** Phase 1 Complete, Phase 2 Planning  
**Next:** Implement offline mode with SQLite cache

