# MyDailyOps — Engineering Problem Book (Version 1.1)

**Статус:** Планирование  
**Версия:** 1.1  
**Дата создания:** 2025-01-10  
**Всего проблем:** 25

---

## 📊 Статистика

- **DESIGN SOLVED:** 24
- **DEFERRED:** 1 (Attachments)
- **Требуют реализации:** 18
- **Не требуют изменений:** 6

---

## 🎯 Приоритеты

### P0 (Критично - Логика recurring и visibility)
1. Problem 2: Recurring Tasks + Duration Overlap
2. Problem 5: Deadline Inside Duration Causes Tasks to Disappear
3. Problem 6: Recurring Tasks With Deadlines
4. Problem 9: Recurring Template Can Be Completed (Wrong)
5. Problem 11: Changing Deadline Breaks Duration Logic

### P1 (Высокий - Core Features)
6. Problem 4: Future Tasks Must Be Visible in Advance (UPCOMING panel)
7. Problem 8: Weekends Visibility Control
8. Problem 10: Always-Show Tasks → Weekly Checklists
9. Problem 18: Desktop Real-time Sync

### P2 (Средний - UI/UX Improvements)
10. Problem 12: Calendar View (Day/Week/Month/Year)
11. Problem 15: Full Calendar Module
12. Problem 19: User Identity Indicator

### P3 (Низкий - Additional Features)
13. Problem 13: Delete All Tasks (Safe Mode)
14. Problem 16: Travel Events (Trips)
15. Problem 17: Timezone-Safe Task Time
16. Problem 20: App Updates (Mobile + Desktop)

### No Changes Required
17. Problem 1: Long Tasks Remain Visible for Many Days ✅
18. Problem 3: Tasks Without Deadline + Long Duration ✅
19. Problem 7: Tasks That Must Always Remain Visible ✅
20. Problem 21-25: Consolidated/Clarified (covered by other problems)

### Deferred
21. Problem 14: Attachments (Files/Photos) in Tasks ⏸️

---

## 🔨 Проблемы для реализации

---

## PROBLEM 1: Long Tasks Remain Visible for Many Days

**Status:** DESIGN SOLVED (Final) ✅  
**Приоритет:** N/A - No changes required

**Summary:**
Tasks with a long duration_days (5-20+) appear every day and remain visible for the entire duration.

**Root Cause:**
The visibility window is based on duration_days, which naturally extends across multiple days.

**Impact:**
No negative impact; expected behaviour.

**Final Approved Solution:**
Long tasks should remain visible for the entire duration. No changes required.

**System Rules:**
* A task with duration N appears for N days.
* This is valid even if duration is large.

**Risks:** None.

---

## PROBLEM 2: Recurring Tasks + Duration Overlap ⚠️ P0

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P0 - Критично

**Summary:**
Recurring tasks with duration can produce overlapping occurrences.

**Root Cause:**
Occurrences are created ahead of time, overlapping visibility windows.

**Impact:**
User may see two identical recurring tasks simultaneously.

**Final Approved Solution:**
Only ONE active occurrence is allowed at a time.
* New occurrence is created only on its start date.
* Previous occurrence closes automatically when new one begins.

**Rules:**
* Recurring template is permanent; occurrences are floating tasks.
* No pre-generation of future occurrences beyond start date.

**Implementation Checklist:**
- [x] Update recurring engine to prevent overlap
- [x] Close previous occurrence when new one starts
- [x] Remove pre-generation logic beyond start date
- [x] Add tests for overlapping prevention

**Affected Systems:**
Recurring Engine, Visibility Engine, DB

**Risk Notes:**
Ensure edge cases with same-day recurrence are handled correctly.

---

## PROBLEM 3: Tasks Without Deadline + Long Duration

**Status:** DESIGN SOLVED (Final) ✅  
**Приоритет:** N/A - No changes required

**Summary:**
Tasks without deadlines but with long duration remain visible for many days.

**Root Cause:**
No deadline anchor point.

**Impact:**
User sees the task repeatedly.

**Final Approved Solution:**
This is correct. Tasks without deadlines but with duration must appear for full duration.

---

## PROBLEM 4: Future Tasks Must Be Visible in Advance ⚠️ P1

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P1 - Высокий

**Summary:**
User wants to see important future tasks before their start date.

**Root Cause:**
Today-view only shows active items.

**Impact:**
User may miss planning windows.

**Final Approved Solution:**
Create a dedicated panel: UPCOMING (next 7 days).
* Future tasks appear there automatically.
* Does not interfere with Today-view.

**Implementation Checklist:**
- [x] Create UPCOMING view component (Desktop)
- [x] Create UPCOMING screen (Mobile)
- [x] Add navigation/route for UPCOMING
- [x] Filter tasks: visible_from <= today + 7 days (using isUpcoming())
- [x] Update sidebar/navigation
- [x] Add tests for UPCOMING filtering (28 tests, all passing)

**Affected Systems:**
UI, Visibility Engine, Sync Layer

**Risk Notes:**
Ensure UPCOMING doesn't conflict with Today-view logic.

---

## PROBLEM 5: Deadline Inside Duration Causes Tasks to Disappear Too Early ⚠️ P0

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P0 - Критично

**Summary:**
If the duration window ends before the deadline, the task may disappear prematurely.

**Root Cause:**
Duration was previously calculated from start_date.

**Impact:**
User may miss critical deadlines.

**Final Approved Solution:**
Duration is calculated backwards from deadline.

**Formula:**
```
visible_from = deadline - (duration_days - 1)
visible_until = deadline
```

**Result:**
Task cannot disappear before its deadline.

**Implementation Checklist:**
- [x] Update visibility calculation logic
- [x] Fix formula in recurring.ts (Desktop)
- [x] Fix formula in recurring.ts (Mobile)
- [x] Update DB migration if needed
- [x] Add tests for deadline-anchored duration

**Affected Systems:**
Recurring Engine, Visibility Engine, DB

**Risk Notes:**
Edge cases with deadlines exactly on duration boundary.

---

## PROBLEM 6: Recurring Tasks With Deadlines Break Duration Rules ⚠️ P0

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P0 - Критично

**Summary:**
Recurring tasks with deadlines + long duration appear inconsistent.

**Root Cause:**
Recurring logic not aligned with duration anchored to deadlines.

**Impact:**
Overlapping occurrences, confusion which deadline applies.

**Final Approved Solution:**
* Recurring tasks CAN have duration.
* Each occurrence is treated as an independent task with its own deadline.
* Title must include deadline (e.g., "Weekly Report - 12/12/2025").
* Overlap is acceptable and expected if recurrence period < duration.

**Implementation Checklist:**
- [x] Update recurring occurrence generation
- [x] Ensure each occurrence has independent deadline
- [x] Update title generation to include deadline
- [x] Handle overlap cases gracefully
- [ ] Update UI to show deadline in recurring task title (Optional - title already includes deadline)

**Affected Systems:**
Recurring Engine, Visibility Engine, UI

**Risk Notes:**
Complexity with weekly/monthly recurring + long duration.

---

## PROBLEM 7: Tasks That Must Always Remain Visible

**Status:** DESIGN SOLVED (Final) ✅  
**Приоритет:** N/A - No changes required

**Summary:**
Some tasks are conceptual reminders that should always appear.

**Final Approved Solution:**
This is valid behaviour. No adjustments needed.

---

## PROBLEM 8: Weekends Visibility Control ⚠️ P1

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P1 - Высокий

**Summary:**
Certain tasks should optionally be hidden on weekends.

**Final Approved Solution:**
Introduce flexible user controls:
* Show tasks on weekends: ON/OFF
If OFF, user can select:
* which categories to hide (Work, Finance, Personal, etc.)
* which priorities to hide
High-priority tasks ALWAYS remain visible.
Tasks remain visible in Calendar & Upcoming regardless of weekend filtering.

**Implementation Checklist:**
- [x] Add settings for weekend filtering
- [x] Store preferences in DB/user settings (localStorage/AsyncStorage)
- [x] Update visibility logic to check weekends
- [x] Add category/priority filters UI
- [x] Ensure high-priority always visible
- [x] Update Calendar/Upcoming to ignore weekend filter
- [x] Add tests for weekend filtering

**Affected Systems:**
UI, Visibility Engine, Settings, DB

**Risk Notes:**
Timezone considerations for weekend detection.

---

## PROBLEM 9: Recurring Main Template Can Be Completed (Wrong) ⚠️ P0

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P0 - Критично

**Summary:**
Completing a recurring template deletes its recurrence behaviour.

**Root Cause:**
Template incorrectly treated as a real task.

**Final Approved Solution:**
* Recurring main template CANNOT be completed.
* Only occurrences can be completed.
* When template is created, first occurrence is generated immediately.

**Implementation Checklist:**
- [x] Disable completion UI for recurring templates
- [x] Update completion logic to check if task is template
- [x] Ensure first occurrence generated on template creation
- [x] Update tests to verify template cannot be completed

**Affected Systems:**
UI, Recurring Engine, DB

**Risk Notes:**
Need clear distinction between template and occurrence.

---

## PROBLEM 10: Always-Show Tasks (non-deadline items) → Weekly Checklists ⚠️ P1

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P1 - Высокий

**Summary:**
User wants persistent weekly check items.

**Final Approved Solution:**
Replace "always visible tasks" with Weekly Checklists:
* Checklist exists for one week
* Saved in history at week end
* Next week generates new instance
* Editing a new checklist does not alter past ones
These are not tasks: no deadlines, no recurring, no duration.

**Implementation Checklist:**
- [x] Create Weekly Checklist entity/table (Supabase + SQLite)
- [x] Design weekly checklist UI (Desktop & Mobile)
- [x] Implement weekly generation logic
- [x] Add history storage
- [x] Create navigation/routes
- [x] Add tests for weekly checklists (39 tests, all passing)

**Affected Systems:**
DB, UI, Sync Layer

**Risk Notes:**
Week boundary detection (Sunday vs Monday start).

---

## PROBLEM 11: Changing Deadline Breaks Duration Logic ⚠️ P0

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P0 - Критично

**Summary:**
Updating a deadline does not update visibility.

**Final Approved Solution:**
Recalculate visibility range each time deadline changes:
visible_from & visible_until automatically recomputed by the formula in Problem 5.

**Implementation Checklist:**
- [x] Update edit task logic
- [x] Trigger visibility recalculation on deadline change
- [x] Apply Problem 5 formula on update
- [x] Update sync logic
- [x] Add tests for deadline change scenarios

**Affected Systems:**
Visibility Engine, UI, Sync Layer

**Risk Notes:**
Ensure recalculation works for both desktop and mobile.

---

## PROBLEM 12: Calendar View (Day/Week/Month/Year) ⚠️ P2

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P2 - Средний

**Summary:**
Calendar must show tasks accurately regardless of duration.

**Final Approved Solution:**
Calendar shows tasks using visible_from → visible_until ranges.
Implementation is UI-only; backend logic already correct.

**Implementation Checklist:**
- [x] Create Calendar component (Desktop)
- [x] Create Calendar screen (Mobile)
- [x] Implement Day/Week/Month/Year views
- [x] Render tasks using visible_from/visible_until
- [x] Add navigation between dates
- [x] Add tests for calendar rendering

**Affected Systems:**
UI

**Risk Notes:**
Performance with many tasks on single day.

---

## PROBLEM 13: Delete All Tasks (Safe Mode) ⚠️ P3

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P3 - Низкий

**Summary:**
Need a secure "Delete All" option without accidental wiping.

**Final Approved Solution:**
* Option only in Settings → Advanced → Danger Zone
* Double confirmation: system popup + typing DELETE
* With Security Mode: requires PIN
* Tasks first go to Trash (soft delete)
* Auto purge after 30 days or manual purge
* Hard delete only from Trash

**Implementation Checklist:**
- [x] Create Trash/soft delete system
- [x] Add "Delete All" in Settings → Advanced
- [x] Implement double confirmation UI
- [ ] Add PIN requirement if security mode enabled (optional, Phase 4)
- [x] Implement auto-purge logic (30 days)
- [x] Add manual purge option (empty trash)
- [x] Create Trash view for recovery
- [x] Add tests for delete all flow (27 tests, all passing)

**Affected Systems:**
DB, UI, Settings

**Risk Notes:**
Ensure sync works correctly with soft delete.

---

## PROBLEM 14: Attachments (Files/Photos) in Tasks ⏸️

**Status:** DEFERRED  
**Приоритет:** Deferred

**Summary:**
Feature adds major architectural complexity.

**Final Approved Solution:**
Postpone until core architecture (recurring, visibility, weekly checklists) is complete.
May be added later as a standalone module.

---

## PROBLEM 15: Full Calendar Module ⚠️ P2

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P2 - Средний

**Summary:**
User needs visual workload control.

**Final Approved Solution:**
Standalone Calendar tab with:
* Day / Week / Month / Year modes
* Mini-calendar for navigation
* Duration rendered as visual bars (implemented as "Day X of Y" labels)
* Recurring occurrences appear as normal tasks
* Year = heatmap view (implemented with color-coded task indicators)
Core working views remain Today + Upcoming.

**Implementation Checklist:**
- [x] Create standalone Calendar module
- [x] Implement Day/Week/Month/Year views
- [x] Add mini-calendar navigation
- [x] Render duration as visual bars (progress bars with Day X of Y labels for multi-day tasks)
- [x] Create heatmap for Year view (enhanced gradient with size/color variations based on task count)
- [x] Add navigation tab
- [x] Add tests for calendar module (65 tests total: 26 integration, 28 utilities, 11 hook)

**Implementation Details:**
- Visual progress bars: Animated progress bars showing task completion progress through duration span, integrated with priority colors (red/yellow/green) and "Start"/"End" labels
- Enhanced heatmap: Gradient color coding (red for high load ≥10, orange for medium 5-9, yellow/blue for low 1-4) with size variations for better visual intensity indication

**Affected Systems:**
UI, Visibility Engine

**Risk Notes:**
Performance optimization for Year/heatmap view.

---

## PROBLEM 16: Travel Events (Trips) ⚠️ P3

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P3 - Низкий

**Summary:**
User needs trips displayed but not treated as tasks.

**Final Approved Solution:**
Create entity TravelEvent:
* start_date → end_date
* name + color only
* NO deadlines, no completion, no duration, no recurring
* Always saved to history
* Visible only in Calendar
* Does not hide or modify tasks

**Implementation Checklist:**
- [x] Create TravelEvent table/schema (Supabase + SQLite Desktop/Mobile)
- [x] Create TravelEvent CRUD operations (Desktop & Mobile)
- [x] Add TravelEvent UI in Calendar (Day/Week/Month/Year views)
- [x] Implement history storage (past/future/current/by year functions)
- [x] Add create/edit TravelEvent screens (Desktop)
- [x] Add sync integration (Desktop & Mobile)
- [x] Add tests for TravelEvent (24 tests, all passed)

**Implementation Details:**
- **Phase 1-2:** Data model, database schema (Supabase + SQLite)
- **Phase 3:** CRUD operations (dbTravelEvents.ts)
- **Phase 4:** Sync integration (syncTravelEvents.ts)
- **Phase 5:** Calendar utilities extension (doesTravelEventOverlapDate, getTravelEventsForDateRange)
- **Phase 6:** Calendar UI components (TravelEventItem, CalendarDay integration)
- **Phase 7:** Create/Edit screens (NewTravelEvent.tsx, EditTravelEvent.tsx)
- **Phase 8:** History functions (getPastTravelEvents, getFutureTravelEvents, getCurrentTravelEvents, getTravelEventsByYear)
- **Phase 9:** Comprehensive tests (24 tests covering model, calendar utilities, edge cases)

**Affected Systems:**
DB, UI, Calendar

**Risk Notes:**
Ensure TravelEvents don't interfere with task logic.

---

## PROBLEM 17: Timezone-Safe Task Time ⚠️ P3

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P3 - Низкий

**Summary:**
Calendar apps shift event time when user changes timezone → chaos.

**Final Approved Solution:**
Each task stores:
* event_time (HH:mm format, e.g., "14:00")
* event_timezone (IANA timezone, e.g., "Europe/London")
Time NEVER auto-adjusts.
UI displays:
14:00 (UK) / 06:00 Local
When user returns to UK, both show 14:00 again.
This eliminates all timezone drift issues.

**Implementation Checklist:**
- [x] Add event_time and event_timezone fields to schema (Supabase, Desktop SQLite, Mobile SQLite)
- [x] Create timezone utilities (formatEventTime, timezone conversion, getCurrentTimezone, getCommonTimezones)
- [x] Extend Task model with event_time and event_timezone
- [x] Update task creation/edit forms (time picker + timezone picker)
- [x] Implement timezone display logic (TaskCard, TaskCalendarItem)
- [x] Update sync to preserve timezone (Desktop & Mobile sync services)
- [x] Add default timezone setting (Settings UI)
- [x] Add tests for timezone handling (35 tests, all passed)

**Implementation Details:**
- Database: Added `event_time` (TEXT/TIME) and `event_timezone` (TEXT) columns to tasks table
- Utilities: Full timezone conversion using Intl API, no external dependencies
- UI: Time picker (input type="time") + timezone select with popular timezones
- Display: Shows "14:00 (GMT) / 09:00 (EST)" format when timezones differ
- Default: User can set default timezone in Settings, used for new tasks
- Sync: Both Desktop and Mobile sync preserve event_time and event_timezone

**Affected Systems:**
DB, UI, Sync Layer, Settings

**Risk Notes:**
Complexity with recurring tasks + timezone.

---

## PROBLEM 18: Desktop App Does Not Update in Real Time ⚠️ P1

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P1 - Высокий

**Summary:**
Desktop lacks realtime sync like mobile.

**Final Approved Solution:**
Hybrid Model:
1. Supabase Realtime subscription
2. Manual "Sync Now" button
3. Auto-polling every 30-60s
4. Refresh on window focus
Ensures desktop & mobile stay perfectly aligned.

**Implementation Checklist:**
- [x] Add Supabase Realtime subscription (Desktop) - already existed
- [x] Create "Sync Now" button in UI
- [x] Implement auto-polling (45s interval)
- [x] Add window focus refresh listener
- [x] Handle offline/online states
- [x] Update sync service with polling and offline handling
- [ ] Add tests for realtime sync (manual testing sufficient for now)

**Affected Systems:**
Sync Layer, UI, Desktop App

**Risk Notes:**
Performance with multiple realtime subscriptions.

---

## PROBLEM 19: User Identity Indicator (Profile) ⚠️ P2

**Status:** ✅ IMPLEMENTED  
**Приоритет:** P2 - Средний

**Summary:**
User needs clear indicator of which account is active.

**Final Approved Solution:**
Variant C:
* Circular initials icon (e.g., AI)
* Name in header (desktop) / header (mobile)
* Optional color
* Tapping opens profile
Prevents accidental task creation in wrong account.

**Implementation Checklist:**
- [x] Create profile component with initials
- [x] Add to header (Desktop)
- [x] Add to header (Mobile)
- [x] Implement profile modal/screen
- [x] Add consistent color generation
- [x] Add tests for profile display

**Affected Systems:**
UI, Auth

**Risk Notes:**
None.

---

## PROBLEM 20: App Updates (Mobile + Desktop) ⚠️ P3

**Status:** ✅ IMPLEMENTED (Requires Configuration)  
**Приоритет:** P3 - Низкий

**Summary:**
APK too large, sending files manually is painful.

**Final Approved Solution:**
Mobile (Android):
* Firebase App Distribution for installation
* OTA (Over-The-Air) updates for daily changes
→ user installs APK once, everything else updates automatically
Desktop (Tauri):
* Built-in Tauri Auto-Updater
→ app auto-checks, downloads patches, updates itself
Result:
No more sending APKs.
No more manual EXE distribution.
Professional update system.

**Implementation Checklist:**
- [x] Configure Tauri Auto-Updater (Desktop) - plugin added, requires signing keys
- [x] Implement update check and UI (Desktop) - Settings button, UpdateNotification component
- [x] Configure OTA updates (Mobile) - Expo Updates configured in app.json and eas.json
- [x] Create update services (Desktop & Mobile) - updateService.ts files created
- [ ] Generate signing keypair and configure update server (Desktop) - see APPS_UPDATES_SETUP.md
- [ ] Set up Firebase App Distribution (Mobile) - requires Firebase project setup
- [ ] Integrate update check UI in Mobile Settings
- [ ] Test update flow for both platforms
- [x] Document update process - APPS_UPDATES_SETUP.md created

**Affected Systems:**
Build System, Distribution

**Risk Notes:**
Initial setup complexity.

---

## PROBLEM 21-25: Consolidated/Clarified

**Status:** DESIGN SOLVED  
**Примечание:** Эти проблемы консолидированы с другими:

* **Problem 21:** Application Sync Mode → см. Problem 18
* **Problem 22:** Filtering Tasks by Category/Priority on Weekends → см. Problem 8
* **Problem 23:** Recurring Template Should Not Be Visible → см. Problem 9
* **Problem 24:** Previews for Future Recurring Occurrences → см. Problem 4 (UPCOMING)
* **Problem 25:** Travel Events Should Not Affect Task Logic → см. Problem 16

---

## 📝 Реализация: План по приоритетам

### Фаза 1: P0 - Критичные исправления логики
1. Problem 5: Deadline Inside Duration (Формула)
2. Problem 2: Recurring Tasks + Duration Overlap
3. Problem 9: Recurring Template Cannot Be Completed
4. Problem 11: Changing Deadline Breaks Duration Logic
5. Problem 6: Recurring Tasks With Deadlines

### Фаза 2: P1 - Core Features
6. Problem 4: UPCOMING Panel (7 дней)
7. Problem 18: Desktop Real-time Sync
8. Problem 8: Weekends Visibility Control
9. Problem 10: Weekly Checklists

### Фаза 3: P2 - UI/UX Improvements
10. Problem 12: Calendar View
11. Problem 15: Full Calendar Module
12. Problem 19: User Identity Indicator

### Фаза 4: P3 - Additional Features
13. Problem 17: Timezone-Safe Task Time
14. Problem 16: Travel Events
15. Problem 13: Delete All Tasks (Safe Mode)
16. Problem 20: App Updates

---

## ✅ Прогресс

**Всего задач:** 18 (требуют реализации)  
**Выполнено:** 0/18  
**В работе:** 0/18  
**Запланировано:** 18/18

---

## 📚 Связанные документы

- `VERSION_1.1_TASKS.md` - Простой список задач
- `RECURRING_TASK_ANALYSIS.md` - Анализ recurring логики
- `SECURITY_SETUP.md` - Настройка безопасности

---

**Последнее обновление:** 2025-01-10
