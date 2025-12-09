# Recurring Task Deletion Logic Analysis

## Executive Summary

**Current Architecture:**
- ✅ Template stored as its own task in `tasks` table
- ❌ NO separate `recurring_rules` table
- ❌ NO `recurring_template_id` foreign key
- ❌ Current deletion logic does NOT handle recurring tasks properly

---

## 1. Database Schema

### Supabase/Shared Schema (`packages/core/src/models/shared.ts`)

**Tasks Table Structure:**
```typescript
interface Task {
  id: string;                    // UUID - primary key
  user_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  deadline: string | null;
  status: TaskStatus;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  recurring_options: RecurringOptions | null;  // JSON field - NULL for instances
  is_completed?: boolean;
}
```

**Key Findings:**
- ✅ Single `tasks` table stores both templates and instances
- ❌ NO `recurring_rules` table exists
- ❌ NO `template_id` or `recurring_template_id` field
- ✅ `recurring_options` is a JSON field stored as TEXT in SQLite/Supabase

---

## 2. Template vs Instance Identification

### Template Task (Recurring Source)
**Identification:**
- `recurring_options !== null`
- `recurring_options.type !== 'none'`
- Has its own `deadline` (typically the first occurrence date)
- Stored as a regular task in the database

**Location:** `apps/mobile/utils/recurring.ts:336`, `apps/desktop/src/utils/recurring.ts:342`

### Generated Instance
**Identification:**
- `recurring_options === null` (instances are NOT recurring themselves)
- Same `title` as template
- Same `user_id` as template
- Different `id` (unique UUID)
- Different `deadline` (future date)
- Status always starts as `'pending'`
- `pinned` always `false`

**Location:** `apps/mobile/utils/recurring.ts:390-402`, `apps/desktop/src/utils/recurring.ts:392-403`

### Current Identification Logic
**Template Detection:**
```typescript
const isTemplate = task.recurring_options !== null && 
                   task.recurring_options.type !== 'none';
```

**Instance Detection (used in `deleteFutureInstances`):**
```typescript
// From apps/mobile/utils/recurring.ts:427-438
const isInstance = 
  task.id !== templateTask.id &&           // Different ID
  task.user_id === templateTask.user_id && // Same user
  task.title === templateTask.title &&     // Same title (⚠️ WEAK LINK)
  !task.recurring_options &&               // No recurring_options
  task.deadline &&                         // Has deadline
  parseISO(task.deadline) > now &&         // Future date
  task.status !== 'done';                  // Not completed
```

**⚠️ PROBLEM:** Instance identification relies on **title matching**, which is fragile if:
- User renames the template
- Multiple recurring tasks have the same title
- Two unrelated tasks accidentally have the same title

---

## 3. Task Creation Flow

### When Creating a Recurring Task:

**Step 1: Create Template Task**
- User creates task with `recurring_options: { type: 'daily', ... }`
- Template is saved as a regular task with:
  - Unique UUID `id`
  - `recurring_options` set (JSON)
  - Original `deadline` (first occurrence date)
  - All other fields (title, description, priority, etc.)

**Location:** 
- Mobile: `apps/mobile/hooks/useSync.ts:114-131`
- Desktop: `apps/desktop/src/stores/taskStore.ts:83-98`

**Step 2: Generate Instances**
- `generateRecurringInstances(templateTask)` is called
- For each future date:
  - Creates new Task object with:
    - New UUID `id`
    - Same `title`, `description`, `priority`, `category`
    - New `deadline` (future date)
    - `recurring_options: null` ⚠️ **THIS IS KEY**
    - `status: 'pending'`
    - `pinned: false`

**Location:**
- Mobile: `apps/mobile/utils/recurring.ts:390-410`
- Desktop: `apps/desktop/src/utils/recurring.ts:392-411`

**Step 3: Save to Database**
- Template task is saved (already saved in Step 1)
- All instances are saved separately as individual tasks
- Both template and instances stored in same `tasks` table

**Step 4: Push to Supabase**
- Template + all instances pushed in batch
- Each has unique `id`, but template has `recurring_options`, instances have `recurring_options: null`

**Location:**
- Mobile: `apps/mobile/hooks/useSync.ts:146-147`
- Desktop: `apps/desktop/src/stores/taskStore.ts:108-109`

---

## 4. Current Deletion Logic

### Mobile App (`apps/mobile/hooks/useSync.ts:279-304`)

```typescript
const deleteTask = async (taskId: string) => {
  // Delete from local cache immediately
  await deleteTaskFromCache(taskId);
  
  // Refresh local view
  await refreshTasks();
  
  // Delete from Supabase in background
  deleteTaskFromSupabase(taskId, userId);
}
```

**⚠️ CURRENT BEHAVIOR:**
- Deletes ONLY the task with matching `taskId`
- Does NOT check if it's a template
- Does NOT check if it's an instance
- Does NOT delete related instances
- Does NOT delete template if instance is deleted
- **Orphaned tasks remain in database**

### Desktop App (`apps/desktop/src/stores/taskStore.ts:222-244`)

```typescript
deleteTask: async (id) => {
  // Delete from SQLite first
  await db.deleteTaskFromCache(id);
  
  // Update local state
  set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  }));
  
  // Delete from Supabase in background
  deleteTaskFromSupabase(id, userId);
}
```

**⚠️ SAME BEHAVIOR AS MOBILE:**
- Deletes ONLY the single task
- No special handling for recurring tasks

---

## 5. Instance Deletion Function (EXISTS but NOT USED for delete)

### `deleteFutureInstances()` Function

**Location:**
- Mobile: `apps/mobile/utils/recurring.ts:420-445`
- Desktop: `apps/desktop/src/utils/recurring.ts:461-488`

**Purpose:** Delete all future instances for a given template (used during UPDATE, not DELETE)

**Logic:**
```typescript
export async function deleteFutureInstances(templateTask: Task): Promise<number> {
  // Find all tasks matching:
  // - Same title
  // - Same user_id
  // - No recurring_options (is instance)
  // - Future deadline
  // - Not completed
  
  // Delete matching tasks
}
```

**⚠️ CURRENT USAGE:**
- ✅ Called when **UPDATING** a recurring task (to regenerate instances)
- ❌ **NOT called** when **DELETING** a task
- ❌ Cannot identify template from an instance (no reverse lookup)

**Problems:**
1. Requires `templateTask` as parameter - but when deleting an instance, we don't have the template
2. Uses title matching (fragile)
3. Only deletes FUTURE instances (keeps overdue)
4. Only works if we have the template task object

---

## 6. Task Update Flow (For Reference)

### When Updating a Recurring Template:

**Location:**
- Mobile: `apps/mobile/hooks/useSync.ts:191-269`
- Desktop: `apps/desktop/src/stores/taskStore.ts:144-215`

**Flow:**
1. Check if task has `recurring_options` (is template)
2. If template:
   - Call `deleteFutureInstances(updatedTask)` - deletes all future instances
   - Update template task
   - Call `generateRecurringInstances(updatedTask)` - creates new instances
   - Push template + new instances to Supabase
3. If not template:
   - Just update the task

**⚠️ NOTE:** This logic assumes we're updating the TEMPLATE. If we update an instance, it becomes a regular task.

---

## 7. Critical Issues in Current Deletion Logic

### Issue 1: No Template/Instance Detection
**Current:** `deleteTask` does not check if task is template or instance.
**Impact:** 
- Deleting template → instances remain orphaned
- Deleting instance → no impact on template or other instances

### Issue 2: No Reverse Lookup
**Current:** To find instances, we need the template. But when deleting, we only have the task ID.
**Impact:**
- Cannot find template from instance ID
- Cannot find all instances from template ID (without title matching)

### Issue 3: Fragile Title Matching
**Current:** Instances identified by `title` matching.
**Impact:**
- If user renames template, instances become orphaned
- Multiple recurring tasks with same title → wrong instances deleted
- Unrelated tasks with same title → false positives

### Issue 4: No Cascade Deletion
**Current:** Deletes only one task.
**Impact:**
- Deleting template should delete all instances (or at least future ones)
- Deleting instance should not affect template or other instances (correct behavior?)

### Issue 5: Orphaned Tasks
**Current:** No cleanup mechanism.
**Impact:**
- Database fills with orphaned instances
- UI shows tasks with no way to edit recurring pattern

---

## 8. Recommended Deletion Behavior

### Scenario A: Delete Recurring Template

**Should:**
1. Delete the template task
2. Delete all future instances (optional: keep past completed instances?)
3. Optionally delete all instances (including past ones)

**Current Behavior:** ❌ Only deletes template, instances remain

### Scenario B: Delete Recurring Instance

**Should:**
1. Delete only that instance
2. Template remains
3. Other instances remain
4. New instances can still be generated

**Current Behavior:** ✅ Already correct (deletes only the instance)

### Scenario C: Delete Non-Recurring Task

**Should:**
1. Delete the task

**Current Behavior:** ✅ Already correct

---

## 9. Detection Logic Needed

### To Determine if Task is Template:
```typescript
function isRecurringTemplate(task: Task): boolean {
  return task.recurring_options !== null && 
         task.recurring_options.type !== 'none';
}
```

### To Find Template from Instance:
```typescript
// ⚠️ CURRENTLY IMPOSSIBLE without title matching
// Would need:
// - Find task with same title and user_id that has recurring_options
// - OR add template_id field to instances (schema change)
```

### To Find All Instances from Template:
```typescript
// Current approach (used in deleteFutureInstances):
// - Find tasks with same title, same user_id, no recurring_options
// ⚠️ Fragile if title changes
```

---

## 10. Schema Limitations

### Missing Fields:
- ❌ `template_id` or `recurring_template_id` - would allow proper linking
- ❌ `is_template` boolean - would make detection explicit
- ❌ `parent_task_id` - would allow instance → template lookup

### Current Workaround:
- Uses `title` + `user_id` matching (fragile)
- Relies on `recurring_options === null` to identify instances
- Cannot reliably find template from instance ID

---

## 11. Sync Layer Behavior

### Pull from Supabase (`pullFromSupabase`)
**Location:**
- Mobile: `apps/mobile/lib/sync.ts:13-108`
- Desktop: `apps/desktop/src/services/syncService.ts:47-108`

**Behavior:**
- Fetches all tasks from Supabase
- Maps to Task format
- Deletes local tasks not in Supabase (to handle deletions)
- ⚠️ If template deleted on one device, sync will delete it locally
- ⚠️ But orphaned instances remain until manually cleaned up

### Push to Supabase (`pushTaskToSupabase`, `pushTasksToSupabaseBatch`)
**Behavior:**
- Pushes individual task or batch
- Template and instances treated as separate tasks
- No special handling for recurring relationships

---

## 12. Summary of Current State

### What Works:
✅ Template is stored as its own task
✅ Instances are generated correctly
✅ Instances are saved to database
✅ Instances have `recurring_options: null`
✅ Update flow handles instance regeneration
✅ Single instance deletion works

### What Doesn't Work:
❌ Deleting template does not delete instances
❌ No way to find template from instance ID
❌ Title-based matching is fragile
❌ No cascade deletion logic
❌ Orphaned instances remain in database
❌ No cleanup mechanism

### What's Missing:
❌ Proper template/instance relationship (no foreign key)
❌ Detection logic in delete function
❌ Cascade deletion for template deletion
❌ UI option for "delete all future instances" vs "delete all instances"
❌ Reverse lookup capability (instance → template)

---

## 13. Recommended Solutions

### Option 1: Add `template_id` Field (Schema Change)
**Pros:**
- Proper foreign key relationship
- Reliable instance → template lookup
- No title matching needed

**Cons:**
- Requires migration
- Breaks existing instances (no template_id)
- Requires data migration script

### Option 2: Enhance Current Logic (No Schema Change)
**Pros:**
- No migration needed
- Works with existing data

**Cons:**
- Still relies on title matching (fragile)
- Cannot reliably find template from instance

### Option 3: Hybrid Approach
**Pros:**
- Add `template_id` for new tasks
- Use title matching as fallback for old tasks
- Gradual migration

**Cons:**
- Complex implementation
- Two identification methods to maintain

---

## 14. Recommended Immediate Fix (No Schema Change)

For `deleteTask` function:

1. **Detect if task is template:**
   - Check `task.recurring_options !== null`

2. **If template:**
   - Find all instances (same title, same user_id, no recurring_options)
   - Delete template + all instances (or offer user choice)
   - Or: Delete template + future instances only

3. **If instance:**
   - Find template (same title, same user_id, has recurring_options)
   - If found, only delete the instance (current behavior is correct)
   - If template not found, delete instance (orphaned)

4. **If not recurring:**
   - Delete task (current behavior is correct)

**Implementation needed:**
- Helper function: `findTemplateFromInstance(instance: Task): Task | null`
- Helper function: `findInstancesFromTemplate(template: Task): Task[]`
- Enhanced `deleteTask` with detection logic

---

## 15. Questions to Answer

1. **When deleting template, should we:**
   - Delete all instances (including past completed ones)?
   - Delete only future instances?
   - Ask user for confirmation?

2. **When deleting instance, should we:**
   - Always delete only that instance? (current behavior)
   - Option to delete template and all instances?

3. **Should we add `template_id` field?**
   - Requires migration
   - But enables proper relationships

4. **What about orphaned instances?**
   - Should we add cleanup logic?
   - Should we prevent orphan creation?

