# MyDailyOps

A modern task management application with mobile and desktop support, built with a clean monorepo architecture.

## Architecture

This project uses a **monorepo structure** with:

- **pnpm workspaces** for dependency management
- **Turborepo** for build orchestration
- **Shared core package** for business logic
- **Separate apps** for mobile (React Native) and desktop (Tauri + React)

## Project Structure

```
mydailyops/
├── apps/
│   ├── mobile/          # React Native mobile app (existing)
│   └── desktop/         # Tauri + React desktop app (new)
├── packages/
│   ├── core/            # Shared TypeScript logic (Task model, recurrence engine)
│   └── ui/              # Shared UI components (placeholder)
├── package.json         # Root package.json
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── turbo.json           # Turborepo configuration
```

## Packages

### `@mydailyops/core`

Shared TypeScript package containing:

- **Task Model**: Core task interface and types
- **Recurrence Engine**: Pure TypeScript logic for recurring tasks
  - `getNextOccurringDate()` - Compute next occurrence
  - `shouldGenerateRecurringInstance()` - Check if generation needed
  - `generateNextTask()` - Generate single instance
  - `computeNextNDates()` - Get N future dates
  - `generateRecurringInstances()` - Generate multiple instances
- **Utilities**: Validation, formatting, date helpers

### `@mydailyops/desktop`

Tauri + React desktop application:

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Tauri (Rust) with SQLite plugin
- **State**: Zustand stores
- **Routing**: React Router
- **Database**: SQLite via `tauri-plugin-sql`

### `@mydailyops/mobile`

React Native mobile application (existing, untouched).

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Rust (for desktop app)
- System dependencies for Tauri

### Installation

```bash
# Install dependencies
pnpm install

# Build core package
pnpm --filter @mydailyops/core build

# Run mobile app
cd apps/mobile
pnpm start

# Run desktop app
cd apps/desktop
pnpm tauri:dev
```

### Development

```bash
# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint
```

## Features

### Task Management

- Create, edit, delete tasks
- Task priorities (low, medium, high)
- Categories and tags
- Due dates and reminders

### Recurring Tasks

- Daily, weekly, monthly recurrence
- Interval-based tasks
- Weekday-specific rules
- Month date rules
- Auto-generation of instances

### Offline Support

- SQLite database for offline storage
- Sync capability (to be implemented)

## Tech Stack

### Mobile
- React Native
- Expo Router
- SQLite
- Supabase

### Desktop
- Tauri (Rust + Web)
- React + TypeScript
- Tailwind CSS
- SQLite (via Tauri plugin)
- Zustand

### Shared
- TypeScript
- date-fns
- Shared business logic

## License

Private project

