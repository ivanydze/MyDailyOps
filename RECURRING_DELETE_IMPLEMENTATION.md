# Recurring Task Deletion Implementation

## Summary

Implemented Option 2: Enhanced deletion logic for recurring tasks without schema changes.

## Changes Made

### 1. Helper Functions Added (Mobile & Desktop)

**Location:**
- `apps/mobile/utils/recurring.ts`
- `apps/desktop/src/utils/recurring.ts`

**New Functions:**
- `isRecurringTemplate(task: Task): boolean` - Checks if a task is a recurring template
- `findAllInstancesFromTemplate(templateTask: Task, allTasks: Task[]): Task[]` - Finds all instances for a template
- `findTemplateFromInstance(instance: Task, allTasks: Task[]): Task | null` - Finds template from an instance (not used in delete, but available)
- `deleteAllInstances(templateTask: Task): Promise<number>` - Deletes all instances (used when deleting template)

### 2. Mobile Delete Logic Updated

**File:** `apps/mobile/hooks/useSync.ts`

**Behavior:**
1. Load the task to determine type
2. If **template** (has `recurring_options`):
   - Find all instances using `findAllInstancesFromTemplate`
   - Delete all instances from local cache
   - Delete template from local cache
   - Delete all tasks (template + instances) from Supabase in parallel
3. If **instance or non-recurring**:
   - Delete only that task from local cache
   - Delete task from Supabase

### 3. Desktop Delete Logic Updated

**File:** `apps/desktop/src/stores/taskStore.ts`

**Behavior:**
- Same as mobile (see above)
- Updates Zustand store to remove all deleted tasks from state

### 4. Sync Service

**No changes needed** - Sync services already handle:
- Pulling from Supabase deletes local tasks not found on server
- Deleting individual tasks works correctly
- Batch deletion (parallel) works correctly

## Deletion Scenarios

### Scenario 1: Delete Recurring Template
**Action:** User deletes a task with `recurring_options`
**Result:**
- Template task deleted
- All instances (past, present, future) deleted
- All deletions synced to Supabase
- Other devices will sync and remove all related tasks

### Scenario 2: Delete Recurring Instance
**Action:** User deletes a single instance (has no `recurring_options`, but belongs to a recurring chain)
**Result:**
- Only that instance deleted
- Template remains
- Other instances remain
- Deletion synced to Supabase

### Scenario 3: Delete Non-Recurring Task
**Action:** User deletes a regular task
**Result:**
- Task deleted
- No side effects
- Deletion synced to Supabase

## Technical Details

### Instance Identification
Uses **title matching** + `user_id` + `recurring_options === null`:
- Same `title` as template
- Same `user_id` as template
- `recurring_options === null` (instances don't have recurring options)

### Limitations
- Title matching is fragile (if user renames template, instances become orphaned)
- Cannot reliably find template from instance without loading all tasks
- No foreign key relationship in database

### Future Improvements
- Consider adding `template_id` field for proper relationships
- Add cleanup function for orphaned instances
- Add UI option to choose deletion scope (all instances vs future only)

## Testing Checklist

### Mobile App Tests
- [ ] Create recurring task with 5 instances
- [ ] Delete template → verify all instances removed
- [ ] Create recurring task again
- [ ] Delete single instance → verify only that instance removed
- [ ] Verify sync removes deleted tasks from other devices

### Desktop App Tests
- [ ] Same as mobile tests above
- [ ] Verify Zustand store updates correctly
- [ ] Verify UI updates immediately after deletion

### Cross-Device Sync Tests
- [ ] Delete template on Desktop → sync Mobile → verify all instances gone
- [ ] Delete instance on Mobile → sync Desktop → verify only instance gone
- [ ] Create recurring task → delete on one device → sync → verify cleanup

## Files Modified

1. `apps/mobile/utils/recurring.ts` - Added helper functions
2. `apps/mobile/hooks/useSync.ts` - Enhanced deleteTask logic
3. `apps/desktop/src/utils/recurring.ts` - Added helper functions
4. `apps/desktop/src/stores/taskStore.ts` - Enhanced deleteTask logic

## Logging

Added console logs for debugging:
- `[useSync] Task is a recurring template, deleting all instances`
- `[useSync] Deleted template + N instances`
- `[TaskStore] Task is a recurring template, deleting all instances`
- `[TaskStore] Deleted template + N instances`
- `[Recurring] Deleted N instances for template: <title>`

