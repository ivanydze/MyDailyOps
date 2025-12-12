# Problem 13: Delete All Tasks (Safe Mode) - Implementation Plan

## Overview
Implement a secure "Delete All" feature with soft delete (Trash) system, double confirmation, and optional PIN requirement.

## Architecture

### 1. Database Changes

#### Desktop (SQLite)
- Add `deleted_at TEXT` column to `tasks` table
- Add `INDEX idx_tasks_deleted_at ON tasks(deleted_at)` for query performance

#### Mobile (SQLite)
- Same as Desktop

#### Supabase
- Add `deleted_at TIMESTAMP WITH TIME ZONE` column to `tasks` table
- Add index for performance
- Migration script needed

### 2. Soft Delete System

#### Core Logic
- **Soft Delete**: Set `deleted_at` to current timestamp instead of deleting
- **Hard Delete**: Only allowed from Trash view (permanently removes)
- **Auto-purge**: Tasks with `deleted_at > 30 days` are automatically hard deleted
- **Recovery**: Users can restore tasks from Trash before auto-purge

#### Task Filtering
- All queries must filter `WHERE deleted_at IS NULL` for active tasks
- Trash view shows tasks where `deleted_at IS NOT NULL`
- Sync must handle soft delete correctly

### 3. Settings UI Structure

```
Settings
  ├── Weekend Visibility Control (existing)
  └── Advanced
      └── Danger Zone
          ├── Delete All Tasks
          │   ├── Confirmation Modal
          │   │   ├── Warning message
          │   │   ├── Type "DELETE" confirmation
          │   │   └── PIN input (if security mode enabled)
          │   └── Processing state
          └── Empty Trash (manual purge)
```

### 4. Confirmation Flow

1. User clicks "Delete All Tasks" in Settings → Advanced → Danger Zone
2. First confirmation modal appears:
   - Warning message explaining consequences
   - Count of tasks to be deleted
   - Text input requiring user to type "DELETE"
   - If security mode enabled: PIN input
3. After confirmation, all tasks are soft-deleted (`deleted_at` set)
4. Success message with option to undo (restore from Trash)

### 5. Trash View

#### Features
- List all soft-deleted tasks (`deleted_at IS NOT NULL`)
- Show deletion date
- Restore button (sets `deleted_at = NULL`)
- Hard delete button (permanently removes)
- Empty Trash button (purges all items in Trash)

#### Navigation
- Desktop: New route `/trash` with Trash screen
- Mobile: New route `/trash` with Trash screen
- Sidebar link: "Trash" with count badge

### 6. Auto-purge Logic

#### Background Job
- Run on app startup (check for tasks older than 30 days)
- Run periodically (daily check)
- Hard delete tasks where `deleted_at < NOW() - 30 days`

### 7. Security Mode & PIN

#### PIN Storage
- Store PIN hash in settings store (not plain text)
- PIN required for:
  - Delete All Tasks
  - Empty Trash
  - Hard delete individual tasks

#### Implementation
- Add PIN setting in Settings → Advanced → Security
- Use bcrypt or similar for hashing
- PIN is optional (if not set, skip PIN requirement)

## Implementation Steps

### Phase 1: Database Schema
1. Create migration scripts:
   - Desktop: Update `initDatabase()` in `apps/desktop/src/lib/db.ts`
   - Mobile: Update `initDatabase()` in `apps/mobile/database/init.ts`
   - Supabase: Create migration `add_deleted_at_to_tasks.sql`

2. Update Task type to include `deleted_at?: string | null`

### Phase 2: Soft Delete Logic
1. Update task store/hooks to filter `deleted_at IS NULL`
2. Create `softDeleteTask()` function
3. Create `restoreTask()` function
4. Create `hardDeleteTask()` function
5. Update all queries to exclude deleted tasks

### Phase 3: Sync Integration
1. Update sync logic to handle `deleted_at` field
2. Ensure soft delete syncs correctly between devices
3. Handle conflicts (restore vs delete)

### Phase 4: Settings UI - Advanced Section
1. Add "Advanced" section to Settings screen
2. Add "Danger Zone" subsection
3. Add "Delete All Tasks" button
4. Create confirmation modal component

### Phase 5: Delete All Implementation
1. Implement "Delete All" function (soft delete all tasks)
2. Add text input for "DELETE" confirmation
3. Add success message with undo option

### Phase 6: PIN System (Optional)
1. Add PIN settings to settings store
2. Implement PIN hash storage
3. Add PIN input to confirmation modal
4. Verify PIN before delete operations

### Phase 7: Trash View
1. Create Trash screen (Desktop & Mobile)
2. List soft-deleted tasks
3. Add restore button
4. Add hard delete button
5. Add Empty Trash button
6. Add navigation links

### Phase 8: Auto-purge
1. Implement auto-purge logic
2. Run on app startup
3. Run periodically (daily check)
4. Hard delete old tasks

### Phase 9: Testing
1. Test soft delete flow
2. Test restore flow
3. Test hard delete flow
4. Test Delete All with confirmation
5. Test PIN requirement (if enabled)
6. Test auto-purge logic
7. Test sync with soft delete

## Files to Create/Modify

### Desktop
- `apps/desktop/src/lib/db.ts` - Add `deleted_at` column
- `apps/desktop/src/stores/taskStore.ts` - Add soft delete functions
- `apps/desktop/src/screens/Settings.tsx` - Add Advanced section
- `apps/desktop/src/components/DeleteAllConfirmation.tsx` - Confirmation modal
- `apps/desktop/src/screens/Trash.tsx` - Trash view
- `apps/desktop/src/services/syncService.ts` - Handle soft delete sync

### Mobile
- `apps/mobile/database/init.ts` - Add `deleted_at` column
- `apps/mobile/hooks/useSync.ts` - Add soft delete functions
- `apps/mobile/app/settings/index.tsx` - Add Advanced section
- `apps/mobile/components/DeleteAllConfirmation.tsx` - Confirmation modal
- `apps/mobile/app/trash/index.tsx` - Trash view

### Shared
- `packages/core/src/types/task.ts` - Add `deleted_at?: string | null` to Task type
- `supabase/migrations/add_deleted_at_to_tasks.sql` - Migration script

## Risk Mitigation

1. **Data Loss**: 
   - Soft delete prevents accidental permanent deletion
   - 30-day retention period allows recovery
   - Double confirmation prevents accidental triggers

2. **Sync Conflicts**:
   - Handle restore vs delete conflicts
   - Prefer restore over delete in conflicts
   - Show sync status in Trash view

3. **Performance**:
   - Index on `deleted_at` for fast filtering
   - Auto-purge keeps Trash size manageable
   - Lazy load Trash view (don't load all deleted tasks at once)

## Notes

- PIN system is optional - can be implemented later if needed
- Auto-purge can be disabled in settings if user wants to keep Trash indefinitely
- Trash count badge shows number of items awaiting purge

