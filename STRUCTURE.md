# MyDailyOps Monorepo Structure

## ✅ Completed Cleanup

- ✅ Deleted `venv/` folder (Python virtual environment)
- ✅ Deleted `python` file
- ✅ Removed all old Python/Kivy desktop code
- ✅ Clean monorepo structure established

## 📁 Final Structure

```
mydailyops/
├── apps/
│   ├── mobile/              # React Native app (existing, untouched)
│   │   ├── app/            # Expo Router screens
│   │   ├── components/     # React Native components
│   │   ├── contexts/       # React contexts
│   │   ├── database/       # SQLite initialization
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities and sync
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   │
│   └── desktop/            # NEW: Tauri + React desktop app
│       ├── src/
│       │   ├── components/ # React components (Layout, Sidebar, Header)
│       │   ├── screens/    # Screen components (Today, AllTasks, NewTask, etc.)
│       │   ├── stores/     # Zustand stores (taskStore, themeStore)
│       │   ├── lib/        # Database utilities
│       │   ├── App.tsx     # Main app component
│       │   └── main.tsx    # Entry point
│       ├── src-tauri/      # Tauri Rust backend
│       │   ├── src/
│       │   │   └── main.rs # Rust entry point
│       │   ├── Cargo.toml  # Rust dependencies
│       │   └── tauri.conf.json
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── packages/
│   ├── core/               # Shared TypeScript logic
│   │   ├── src/
│   │   │   ├── models/
│   │   │   │   └── task.ts        # Task interface and types
│   │   │   ├── recurrence/
│   │   │   │   ├── engine.ts      # Core recurrence logic
│   │   │   │   ├── types.ts       # Recurrence types
│   │   │   │   └── utils.ts       # Recurrence utilities
│   │   │   ├── utils/
│   │   │   │   ├── validation.ts  # Task validation
│   │   │   │   └── format.ts      # Date/format utilities
│   │   │   └── index.ts           # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                 # Shared UI components (placeholder)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json            # Root package.json with workspace scripts
├── pnpm-workspace.yaml     # pnpm workspace configuration
├── turbo.json              # Turborepo pipeline configuration
├── tsconfig.json           # Root TypeScript config
└── README.md               # Project documentation
```

## 📦 Packages

### `@mydailyops/core`

**Purpose**: Shared TypeScript logic used by both mobile and desktop apps

**Exports**:
- `Task` interface and `RecurringOptions` type
- `createTask()` and `normalizeTask()` helpers
- Recurrence engine functions:
  - `getNextOccurringDate()` - Compute next occurrence date
  - `shouldGenerateRecurringInstance()` - Check if generation needed
  - `generateNextTask()` - Generate single recurring instance
  - `computeNextNDates()` - Get N future dates
  - `generateRecurringInstances()` - Generate multiple instances
- Utility functions: validation, date formatting

### `@mydailyops/desktop`

**Purpose**: Tauri-based desktop application

**Tech Stack**:
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Tauri 2.0 (Rust) with SQLite plugin
- **State**: Zustand stores
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with dark mode support

**Screens**:
- `/` - Today view
- `/tasks` - All tasks
- `/tasks/new` - Create new task
- `/tasks/:id/edit` - Edit task
- `/categories` - Category management

**Tauri Commands** (to be implemented):
- `init_db` - Initialize database schema
- `get_tasks` - Fetch all tasks
- `add_task` - Create new task
- `update_task` - Update existing task
- `delete_task` - Delete task
- `generate_recurring_tasks` - Generate recurring instances

### `@mydailyops/mobile`

**Purpose**: React Native mobile application (existing, unchanged)

## 🔧 Configuration Files

### Root `package.json`
- Workspace scripts: `dev`, `build`, `lint`, `clean`
- Turborepo and TypeScript as dev dependencies
- Package manager: pnpm 8.15.0

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json`
- `dev`: No cache, persistent
- `build`: Depends on `^build` (builds dependencies first)
- `lint`: Depends on `^lint`
- `clean`: No cache

## 🚀 Next Steps

1. **Implement Tauri Commands**: Create Rust functions for database operations
2. **Database Schema**: Implement SQLite schema using Drizzle ORM
3. **Complete Desktop UI**: Implement task forms, lists, and recurring settings
4. **Sync Logic**: Implement sync between desktop and mobile (via Supabase)
5. **Testing**: Add unit tests for core package

## 📝 Notes

- Mobile app (`apps/mobile`) is **untouched** and continues to work as before
- All recurring logic is now in `@mydailyops/core` - both apps import from this package
- Desktop app uses Tauri for native SQLite access
- Shared TypeScript ensures consistency between mobile and desktop

