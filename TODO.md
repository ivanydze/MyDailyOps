# MyDailyOps — Development Roadmap

Updated: 2025-12-03

---

# 🟥 Urgent / Blocking Tasks

### ✅ 1. TaskCard Finalisation — COMPLETED (2025-12-03)
- ✅ Ensure Python + KV both use **MDSwipeItem**
- ✅ Test SwipeLeft + SwipeRight logic
- ✅ Fix spacing/padding around icons
- ✅ Add ripple/hover feedback

### ✅ 2. TasksScreen UI Polishing — COMPLETED (2025-12-03)
- ✅ Fix paddings and margins
- ✅ Use proper MD3 background colors
- ✅ Improve group header visibility
- ✅ Add FAB (Floating Action Button)
- ✅ Add filter banner
- ✅ Add empty state
- ✅ Improve spacing throughout

---

# 🟦 UI / UX Enhancements

### Theme
- Implement Material 3 Light theme
- Use MD3 color tokens (primary, surface, background, outline)

### ✅ Floating Action Button (Add Task) — COMPLETED
- ✅ Add FAB in bottom-right corner
- ✅ MDButton round style (elevated)
- ✅ Action → open_add_task()

### Task List
- ✅ Show pin icon for pinned tasks
- ✅ Animate appearance of task cards
- ✅ Show task count in group headers
- Optional: Add subtle dividers between groups

### Search Bar
- Smooth expand/collapse animation
- Add clear button
- Use outlined MDTextField

### Filters
- Replace dropdown with M3 menu
- Add small banner: "Filtered: High Priority"
- Store last selected filter

---

# 🟩 Task CRUD Improvements

### Add Task
- Add validation for empty title
- Toast: "Task created ✓"
- Auto-refresh & auto-return to TasksScreen

### Edit Task
- Add validation
- Toast: "Updated ✓"
- Update `updated_at` correctly

---

# 🟪 Backend & Sync

### Supabase Enhancements
- Add try/except around network requests
- Add caching + future offline mode
- Handle Supabase downtime gracefully

### Future
- SQLite offline mirror
- Background sync service

---

# 🟧 Codebase & Architecture

### Refactoring
- Move grouping/sorting to `utils/tasks.py`
- Convert filter names into Enum/constants
- Move repeated label/icon logic into helper functions

### Testing
- Add smoke test for each screen
- Add dedicated swipe-test screen for development

---

# 🟨 Optional Features (Future)
- Proper Dark Mode (MD3 design)
- Drag & drop task reordering
- Export tasks to JSON/CSV/TXT
- System tray icon + background reminders
- Daily "You have X tasks today" summary notification

---

# 🟩 Completed

✔ Material 3 migration
✔ Login works
✔ Supabase connected
✔ Task loading OK
✔ Grouping OK
✔ Filters OK
✔ Search OK
✔ Sort OK
✔ Swipe (MD3) fully replaced
✔ Black screen fixed
✔ TaskCard rewritten (Python + KV)

---

# 📌 Next Developer Action

### Implement final TaskCard (MDSwipeItem) and test with multiple items
Then continue TasksScreen UI improvements.

