# DEVELOPMENT.md

# MyDailyOps — Developer Guide

This document provides **coding standards, workflow rules, architecture notes, and setup instructions** for developers working on the MyDailyOps project.

Last updated: **2025-12-03**

---

# 📦 Project Overview

MyDailyOps is a Windows desktop application for managing personal tasks.  
It uses **KivyMD (Material 3)** on the frontend and **Supabase** for authentication and data storage.

The project aims to provide:
- clean and stable architecture
- predictable behaviour
- consistent UI/UX based on Material Design 3
- reliable backend connection

---

# ⚙ Development Environment

## Requirements
- Python **3.10+**
- Windows 10 or higher
- Virtual environment (`venv`)
- Supabase project (URL + anon key)

## Setup

```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` file in project root:

```
SUPABASE_URL=your-url
SUPABASE_KEY=your-anon-key
```

Run the project:

```bash
python main.py
```

---

# 🧱 Project Architecture

```
MyDailyOps/
├── main.py
├── app/
│   ├── screens/        # Each screen = 1 Python file
│   ├── ui/             # KV layouts
│   ├── widgets/        # Reusable components (TaskCard etc.)
│   ├── supabase/       # Backend client
│   ├── utils/          # Helper functions
│   └── database/       # Reserved for offline mode
```

---

# 🔥 Coding Standards

## 1. **Python (PEP8 + Project Rules)**
- Max line length: **100 chars**
- Use **snake_case** for functions and variables
- Use **PascalCase** for classes
- Do not write business logic inside KV files
- Avoid circular imports — keep logic inside screens, widgets, or utils

## 2. **KV Files (Material 3 Rules)**
- Use MD3 typography: `BodyLarge`, `TitleMedium`, etc.
- Avoid removed styles (`H1`, `H2`, `Subtitle2`, `Body2`)
- Everything inside ScrollView must have:

```
size_hint_y: None
height: self.minimum_height
```

- No deprecated widgets:
  - ❌ MDRaisedButton → ✔ MDButton(style="filled")
  - ❌ MDToolbar → ✔ MDTopAppBar
  - ❌ MDSeparator → ✔ MDDivider
  - ❌ MDSwipeLeftButton / MDSwipeRightButton → ✔ SwipeLeft / SwipeRight

## 3. **KivyMD Material 3 Rules**
- Every screen must have a clear app bar
- Use spacing values in dp, not px
- Avoid hard-coded colours — use the theme
- Use `adaptive_height` only for child widgets, not for ScrollView root

---

# 🧩 Screens: Best Practices

## **LoginScreen**
- Validate input before sending to Supabase
- For errors: show toast or MDDialog
- On success: store user in `app.current_user`

## **TasksScreen**
- Never load tasks in `__init__`
- Use `on_pre_enter()` to fetch data
- Always clear tasks list before rendering
- Group tasks by dates inside helper functions

## **AddTask / EditTask**
- Validate title
- Ensure correct `deadline` format
- Update `updated_at` on every edit

---

# 🧱 Widgets: TaskCard

### Current implementation uses:
```
MDSwipeItem
SwipeLeft
SwipeRight
```

### Rules
- All swipe logic must be inside the `TaskCard` class
- Parent screen should only pass callbacks
- Keep layout height fixed (e.g., 80dp)
- Always place text inside a vertical BoxLayout

---

# 🔁 Data Flow

```
App start → LoginScreen → TasksScreen → (CRUD screens)

TasksScreen:
    load_tasks() → supabase → all_tasks
    apply_filter() → filtered_tasks
    render_tasks() → UI
```

All Supabase operations must be wrapped in `try/except` (to be implemented).

---

# 🧪 Testing Guide

## Manual Tests
Every commit must pass basic smoke tests:

### Login
- Wrong email → error
- Wrong password → error
- Correct credentials → TasksScreen loads

### TasksScreen
- Load tasks → no crash
- Grouping visible
- Swipe left → marks done
- Swipe right → edit/delete

### CRUD
- Add, edit, delete, pinned, done toggling

## UI Tests
- Window resizes correctly
- No invisible elements
- No black-screen conditions

---

# 🚀 Build / Distribution

Later planned:
- PyInstaller build script
- Single EXE output
- Optional installer (NSIS / Inno Setup)

---

# 📌 Development Workflow

1. **Create a feature branch**
2. Implement feature in both Python + KV
3. Test on Windows
4. Ensure no Material 3 violations
5. Commit → merge to main
6. Update SUMMARY.md and TODO.md

---

# 🧭 Roadmap (High-Level)

### Phase 1 — Core Stability (Done)
- MD3 migration
- Swipe system rewrite
- Fix critical layout bugs

### Phase 2 — UI Polishing (Current)
- Colours, spacing, typography
- Cleaner task list

### Phase 3 — Offline Mode
- SQLite cache + background sync

### Phase 4 — Packaging
- Windows EXE + update system

### Phase 5 — Advanced Features
- Daily summary notifications
- Drag & drop reorder
- Task templates

---

# ✔ Final Notes

MyDailyOps follows a **strict separation of concerns**:
- Screens = logic
- KV = layout
- Widgets = reusable components
- Utils = helpers
- Supabase client isolated in its own module

This ensures the project remains **maintainable, scalable, and clean**.

