# Changelog

## [2025-12-03] - TaskCard Finalization & UI Polish

### Added
- ✅ **run.bat** — Windows launcher script (auto-activates venv)
- ✅ **README.md** — Quick start guide and project overview
- ✅ **FAB (Floating Action Button)** — Quick task creation (MDFabButton)
- ✅ **Filter Banner** — Shows active filter with clear button
- ✅ **Empty State** — Helpful message when no tasks found
- ✅ **Priority Color Indicator** — Vertical colored bar on task cards
- ✅ **Pin Icon** — Visual indicator for pinned tasks
- ✅ **Group Headers** — Now show task counts (e.g., "Today (3)")
- ✅ **Ripple Effects** — All buttons have touch feedback
- ✅ **Error Handling** — Try/catch blocks with toast notifications

### Changed
- 🔄 **TaskCard** — Migrated from non-existent MDSwipeItem to MDCard
- 🔄 **Action Buttons** — Now always visible (status, edit, delete)
- 🔄 **Font Styles** — Updated to KivyMD 2.0 format (font_style + role)
- 🔄 **Typography** — Proper MD3 hierarchy throughout
- 🔄 **Spacing & Padding** — Consistent 16dp/8dp spacing system
- 🔄 **Colors** — Using theme_cls color tokens (MD3 compliant)

### Fixed
- 🐛 **Import Error** — Fixed MDSwipeItem (doesn't exist) → MDCard
- 🐛 **FAB Error** — Fixed MDFloatingActionButton → MDFabButton
- 🐛 **Font Style Error** — Fixed BodySmall → font_style: "Body" + role: "small"
- 🐛 **Launch Issues** — Created run.bat for reliable startup
- 🐛 **Typography Errors** — All labels now use correct MD3 format

### Technical Details

#### Widget Migrations
```
MDSwipeItem → MDCard (base for TaskCard)
MDFloatingActionButton → MDFabButton
```

#### Font Style Syntax (KivyMD 2.0)
```kv
# Old (doesn't work)
font_style: "BodySmall"

# New (correct)
font_style: "Body"
role: "small"
```

#### Available Font Styles
- Display: large, medium, small
- Headline: large, medium, small
- Title: large, medium, small
- Body: large, medium, small
- Label: large, medium, small

### Files Modified
- `app/widgets/task_card.py` — Refactored to use MDCard
- `app/widgets/task_card.kv` — Complete redesign with MD3
- `app/ui/tasks_screen.kv` — Added FAB, filter banner, improved layout
- `app/screens/tasks_screen.py` — Added empty state, error handling, better notifications
- `SUMMARY.md` — Updated with current implementation status
- `TODO.md` — Marked completed tasks
- `run.bat` — NEW: Windows launcher
- `README.md` — NEW: Quick start guide
- `CHANGELOG.md` — NEW: This file

### Documentation
- ✅ **TESTING_CHECKLIST.md** — Comprehensive manual testing guide
- ✅ **IMPLEMENTATION_SUMMARY.md** — Detailed technical documentation
- ✅ **SUMMARY.md** — Updated project overview
- ✅ **README.md** — Quick start and setup guide

### Known Issues
- None — Application runs successfully

### Next Steps
1. User testing with TESTING_CHECKLIST.md
2. Add/Edit Task screen validation improvements
3. Offline mode with SQLite cache
4. Performance testing with 20+ tasks

---

## Previous Versions

### [Pre-2025-12-03] - Initial Development
- Basic task management
- Supabase integration
- Initial Material 3 migration
- Login functionality
- CRUD operations
- Grouping and filtering

