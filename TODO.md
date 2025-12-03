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

### ✅ 3. Login Screen Improvements — COMPLETED (2025-12-03)
- ✅ Fix text field placeholder visibility
- ✅ Implement proper MDTextField structure (with child widgets)
- ✅ Add keyboard navigation (TAB between fields)
- ✅ Add ENTER key support (submit form)
- ✅ Improve error messages
- ✅ Add toast notifications for login

---

# 🟦 UI / UX Enhancements

### ✅ Theme — COMPLETED
- ✅ Implement Material 3 Light theme
- ✅ Use MD3 color tokens (primary, surface, background, outline)

### ✅ Login Screen — COMPLETED
- ✅ Proper text field styling with visible placeholders
- ✅ Keyboard navigation (TAB/ENTER)
- ✅ Error handling with colored messages
- ✅ Helper text on focus

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
- ✅ Smooth expand/collapse animation
- ✅ Use outlined MDTextField
- Optional: Add clear button inside field

### Filters
- ✅ Uses M3 dropdown menu
- ✅ Add banner: "Filtered: [filter name]"
- Optional: Store last selected filter (persistence)

---

# 🟩 Task CRUD Improvements

### ✅ Add Task — COMPLETED (2025-12-03)
- ✅ Add validation for empty title
- ✅ Toast: "Task created ✓"
- ✅ Auto-refresh & auto-return to TasksScreen
- ✅ Date and time picker
- ✅ Priority dropdown menu
- ✅ TAB navigation
- ✅ Proper Material 3 styling

### ✅ Edit Task — COMPLETED (2025-12-03)
- ✅ Add validation
- ✅ Toast: "Updated ✓"
- ✅ Update `updated_at` correctly
- ✅ Date and time picker
- ✅ Priority dropdown menu
- ✅ TAB navigation
- ✅ Proper Material 3 styling

---

# 🟪 Backend & Sync

### Supabase Enhancements
- ✅ Add try/except around network requests
- ✅ Handle Supabase downtime gracefully (toast notifications)
- Future: Add caching + offline mode

### Future
- SQLite offline mirror
- Background sync service

---

# 🟧 Codebase & Architecture

### ✅ Refactoring — COMPLETED (2025-12-03)
- ✅ Move grouping/sorting to `utils/tasks.py`
- ✅ Convert filter names into Enum/constants (TaskFilter, TaskPriority, TaskStatus)
- ✅ Move repeated label/icon logic into helper functions
- ✅ Created centralized task utilities module

### Testing
- ✅ Add automated test suite (test_app.py)
- Optional: Add smoke test for each screen individually
- Optional: Add dedicated swipe-test screen for development

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
✔ TaskCard finalized with proper MD3 design (2025-12-03)
✔ FAB added (2025-12-03)
✔ Filter banner (2025-12-03)
✔ Empty state (2025-12-03)
✔ Error handling for Supabase (2025-12-03)
✔ Ripple effects on buttons (2025-12-03)
✔ Login screen MD3 styling (2025-12-03)
✔ Text field placeholders fixed (2025-12-03)
✔ Keyboard navigation - TAB and ENTER (2025-12-03)
✔ Add Task screen - full MD3 redesign (2025-12-03)
✔ Edit Task screen - full MD3 redesign (2025-12-03)
✔ Date picker integration (2025-12-03)
✔ Date + Time picker (chained) (2025-12-03)
✔ Priority dropdown menu (2025-12-03)
✔ Automated test suite (test_app.py) (2025-12-03)
✔ Code refactoring - utils/tasks.py module (2025-12-03)
✔ Enums for filters, priorities, statuses (2025-12-03)

---

# 📌 Next Developer Action

### User Testing & Bug Fixes
1. **Test all features with real data** (see TESTING_CHECKLIST.md)
2. **Verify performance with many tasks** (20+ items)
3. **Test date+time picker functionality**
4. **Test priority dropdown in both Add/Edit screens**
5. **Verify TAB navigation works everywhere**
6. **Fix any bugs found during testing**

Then proceed to:
- Category dropdown (similar to priority)
- Offline mode (SQLite cache)
- Advanced features (drag & drop, templates)
- Dark mode toggle

