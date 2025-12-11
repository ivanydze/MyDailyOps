# Calendar View Architecture Proposal

**Version:** 1.1  
**Status:** Design Proposal (Pre-Implementation)  
**Date:** 2025-01-12

## Executive Summary

This document proposes the internal architecture for the Calendar View module (Day, Week, Month, Year) in MyDailyOps. The design reuses the existing visibility engine, maintains consistency with Today/Upcoming views, and provides a clean, extensible foundation for future features like travel events.

---

## 1. Core Principles

### 1.1 Reuse Existing Visibility Engine
- **No recalculation in UI components**: All visibility calculations are done via `calculateVisibility()` and stored in `visible_from`/`visible_until` fields.
- **Consistent with Today/Upcoming**: Calendar uses the same filtering logic (`isTaskVisible()` from `visibility.ts`).
- **Single source of truth**: Supabase database contains pre-calculated visibility ranges.

### 1.2 Filter Out Recurring Templates
- **Only instances appear**: Recurring templates (`isRecurringTemplate(task) === true`) are excluded from Calendar views.
- **Each instance is independent**: Instances have their own `visible_from`/`visible_until` calculated from their deadline.

### 1.3 Multi-Day Span Representation
- **Tasks span multiple days**: A task with `visible_from = 2025-01-10` and `visible_until = 2025-01-14` appears on all 5 days (Jan 10, 11, 12, 13, 14).
- **Each day gets a reference**: The same task ID appears in multiple days, but each day maintains its own context (e.g., "Day 3 of 5").

### 1.4 Timezone Stability
- **Date-only comparisons**: Use `startOfDay()` from `date-fns` for all date comparisons to avoid timezone issues.
- **ISO date strings**: All dates stored and compared as ISO date strings (YYYY-MM-DD format).

---

## 2. Proposed Internal API

### 2.1 Core Function: `getTasksForDateRange()`

**Location:** `apps/desktop/src/utils/calendar.ts` (and mobile equivalent)

**Purpose:** Fetch and filter tasks that intersect with a given date range.

**Signature:**
```typescript
interface CalendarTaskQuery {
  startDate: Date;        // Start of range (inclusive)
  endDate: Date;          // End of range (inclusive)
  includeCompleted?: boolean;  // Default: false
  userId: string;
}

interface CalendarTask {
  task: Task;             // Original task object
  visibleFrom: string;    // ISO date string (YYYY-MM-DD)
  visibleUntil: string;   // ISO date string (YYYY-MM-DD)
  spanDays: number;       // visible_until - visible_from + 1
}

function getTasksForDateRange(
  tasks: Task[],
  query: CalendarTaskQuery
): CalendarTask[]
```

**Logic:**
1. Filter out recurring templates using `isRecurringTemplate(task)`.
2. Filter out completed tasks unless `includeCompleted === true`.
3. For each task, check if its visibility range intersects with `[startDate, endDate]`.
4. Return tasks with their visibility metadata attached.

**Visibility Intersection Check:**
```typescript
function doesTaskIntersectDateRange(
  visibleFrom: string | null,
  visibleUntil: string | null,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  // If no visibility range, task is always visible (legacy behavior)
  if (!visibleFrom && !visibleUntil) {
    return true;
  }
  
  const rangeStartDay = startOfDay(rangeStart);
  const rangeEndDay = startOfDay(rangeEnd);
  
  if (visibleFrom && visibleUntil) {
    const taskFrom = startOfDay(parseISO(visibleFrom));
    const taskUntil = startOfDay(parseISO(visibleUntil));
    // Intersection: task range overlaps with calendar range
    return taskFrom <= rangeEndDay && taskUntil >= rangeStartDay;
  }
  
  // Handle partial visibility ranges (only from or only until)
  // ... (similar to isTaskVisible logic)
}
```

---

### 2.2 Core Function: `groupTasksByDay()`

**Location:** `apps/desktop/src/utils/calendar.ts`

**Purpose:** Group tasks by the days they appear on, handling multi-day spans.

**Signature:**
```typescript
interface DayTaskGroup {
  date: Date;                    // The specific day
  dateKey: string;               // ISO date string (YYYY-MM-DD) for keying
  tasks: CalendarTask[];         // Tasks visible on this day
}

function groupTasksByDay(
  calendarTasks: CalendarTask[],
  startDate: Date,
  endDate: Date
): DayTaskGroup[]
```

**Logic:**
1. Generate all days in the range `[startDate, endDate]`.
2. For each day, check which tasks are visible on that day using `isTaskVisible(visibleFrom, visibleUntil, dayDate)`.
3. Return array of `DayTaskGroup` objects, one per day.

**Multi-Day Span Handling:**
- A task with `visible_from = 2025-01-10` and `visible_until = 2025-01-14` appears in:
  - `DayTaskGroup` for 2025-01-10
  - `DayTaskGroup` for 2025-01-11
  - `DayTaskGroup` for 2025-01-12
  - `DayTaskGroup` for 2025-01-13
  - `DayTaskGroup` for 2025-01-14
- Each group contains the same `CalendarTask` object (shared reference).

---

### 2.3 Hook: `useCalendarTasks()`

**Location:** `apps/desktop/src/hooks/useCalendarTasks.ts`

**Purpose:** React hook that provides calendar-ready task data for a date range.

**Signature:**
```typescript
interface UseCalendarTasksOptions {
  view: 'day' | 'week' | 'month' | 'year';
  centerDate: Date;              // Center date for the view
  includeCompleted?: boolean;
}

interface UseCalendarTasksReturn {
  dayGroups: DayTaskGroup[];     // Tasks grouped by day
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useCalendarTasks(
  options: UseCalendarTasksOptions
): UseCalendarTasksReturn
```

**Implementation:**
1. Calculate `startDate` and `endDate` based on `view` and `centerDate`:
   - **Day**: `startDate = centerDate`, `endDate = centerDate`
   - **Week**: `startDate = startOfWeek(centerDate)`, `endDate = endOfWeek(centerDate)`
   - **Month**: `startDate = startOfMonth(centerDate)`, `endDate = endOfMonth(centerDate)`
   - **Year**: `startDate = startOfYear(centerDate)`, `endDate = endOfYear(centerDate)`
2. Use `useTaskStore()` to get all tasks.
3. Call `getTasksForDateRange(tasks, { startDate, endDate, includeCompleted, userId })`.
4. Call `groupTasksByDay(calendarTasks, startDate, endDate)`.
5. Return grouped data with loading/error states.

**Memoization:**
- Memoize `dayGroups` using `useMemo()` with dependencies: `tasks`, `startDate`, `endDate`, `includeCompleted`.

---

### 2.4 Helper Function: `getDayContextForTask()`

**Location:** `apps/desktop/src/utils/calendar.ts`

**Purpose:** Provide context information for a task on a specific day (useful for UI labels like "Day 3 of 5").

**Signature:**
```typescript
interface TaskDayContext {
  dayIndex: number;        // Which day of the span (1-based: 1, 2, 3, ...)
  totalDays: number;       // Total span length
  isFirstDay: boolean;
  isLastDay: boolean;
  isMiddleDay: boolean;
}

function getDayContextForTask(
  task: CalendarTask,
  date: Date
): TaskDayContext | null
```

**Logic:**
1. If task doesn't have `visibleFrom`/`visibleUntil`, return `null` (no context).
2. Calculate which day of the span `date` represents.
3. Return context object with labels.

**Example:**
- Task spans Jan 10-14 (5 days).
- On Jan 12: `{ dayIndex: 3, totalDays: 5, isFirstDay: false, isLastDay: false, isMiddleDay: true }`
- On Jan 10: `{ dayIndex: 1, totalDays: 5, isFirstDay: true, isLastDay: false, isMiddleDay: false }`

---

## 3. Data Flow Architecture

### 3.1 Component Hierarchy

```
CalendarView (UI Component)
  ↓
useCalendarTasks() Hook
  ↓
useTaskStore() Hook (existing)
  ↓
getTasksForDateRange() Utility
  ↓
groupTasksByDay() Utility
  ↓
isTaskVisible() from visibility.ts (existing)
```

### 3.2 Data Transformation Pipeline

```
Raw Tasks (from store)
  ↓ [Filter 1: Remove recurring templates]
Active Tasks (instances only)
  ↓ [Filter 2: Remove completed (optional)]
Visible Tasks
  ↓ [Filter 3: Date range intersection]
Tasks in Range
  ↓ [Enrich: Add visibility metadata]
CalendarTasks
  ↓ [Group: By day]
DayTaskGroups
  ↓ [Render: UI component]
Calendar View
```

---

## 4. File Structure

### Desktop App (`apps/desktop/src/`)

```
utils/
  calendar.ts              # Core calendar utilities
    - getTasksForDateRange()
    - groupTasksByDay()
    - doesTaskIntersectDateRange()
    - getDayContextForTask()

hooks/
  useCalendarTasks.ts      # React hook for calendar data
    - useCalendarTasks()

screens/
  Calendar.tsx             # Calendar view component (to be implemented)
    - Uses useCalendarTasks()
    - Renders Day/Week/Month/Year views

components/
  calendar/
    CalendarDay.tsx        # Single day component (to be implemented)
    CalendarWeek.tsx       # Week view component (to be implemented)
    CalendarMonth.tsx      # Month view component (to be implemented)
    CalendarYear.tsx       # Year view component (to be implemented)
    TaskCalendarItem.tsx   # Task item in calendar (to be implemented)
```

### Mobile App (`apps/mobile/`)

```
utils/
  calendar.ts              # Same as desktop (core utilities)

hooks/
  useCalendarTasks.ts      # Same as desktop (React hook)

screens/
  CalendarScreen.tsx       # Calendar view (to be implemented)
```

---

## 5. Integration with Existing Systems

### 5.1 Task Store Integration

**No modifications required.** The hook reads from `useTaskStore()` which already:
- Loads tasks with `visible_from`/`visible_until` fields
- Excludes recurring templates in UI views (though they exist in the store)
- Handles offline-first caching

### 5.2 Visibility Engine Integration

**No modifications required.** Calendar uses existing functions:
- `isTaskVisible(visibleFrom, visibleUntil, checkDate)` - from `visibility.ts`
- Reuses the same formulas and logic as Today/Upcoming views

### 5.3 Recurring Tasks Integration

**Filtering only.** Calendar excludes templates using `isRecurringTemplate(task)`:
- Templates: `task.recurring_options.type !== 'none'` → Excluded
- Instances: `task.recurring_options === null` → Included (if visible)

---

## 6. Travel Events Extension (Future)

### 6.1 Placeholder Structure

When travel events are implemented (Problem 16), the architecture will extend naturally:

```typescript
interface TravelEvent {
  id: string;
  title: string;
  startDate: string;      // ISO date (YYYY-MM-DD)
  endDate: string;        // ISO date (YYYY-MM-DD)
  location?: string;
  userId: string;
}

interface CalendarDayGroup {
  date: Date;
  dateKey: string;
  tasks: CalendarTask[];
  travelEvents: TravelEvent[];  // Added later
}
```

### 6.2 Integration Points

1. **Store Hook**: `useTravelEvents()` (to be created) provides travel events.
2. **Merge Function**: `mergeTasksAndEvents(dayGroups, travelEvents)` combines data.
3. **Rendering**: Calendar UI renders both tasks and travel events on each day.

**No changes to core calendar utilities required** - only addition of travel events to `DayTaskGroup`.

---

## 7. Performance Considerations

### 7.1 Optimization Strategies

1. **Memoization**: `useMemo()` in `useCalendarTasks()` prevents recalculation on every render.
2. **Date Range Limiting**: Only fetch tasks for the visible range (e.g., month view fetches only that month).
3. **Virtual Scrolling**: For Year view, use virtual scrolling for months.
4. **Lazy Loading**: Load tasks for adjacent months/weeks in background.

### 7.2 Expected Performance

- **Day View**: < 10ms (few tasks per day)
- **Week View**: < 50ms (moderate tasks)
- **Month View**: < 200ms (many tasks, but optimized filtering)
- **Year View**: < 500ms (with virtual scrolling)

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File:** `apps/desktop/src/utils/__tests__/calendar.test.ts`

Test cases:
1. `getTasksForDateRange()`:
   - Filters out recurring templates
   - Filters by date range correctly
   - Handles tasks with/without visibility ranges
   - Handles edge cases (null dates, invalid ranges)
2. `groupTasksByDay()`:
   - Groups tasks correctly by day
   - Handles multi-day spans (task appears on multiple days)
   - Handles single-day tasks
   - Handles tasks spanning month/year boundaries
3. `getDayContextForTask()`:
   - Calculates day index correctly
   - Identifies first/last/middle days correctly

### 8.2 Integration Tests

**File:** `apps/desktop/src/hooks/__tests__/useCalendarTasks.test.ts`

Test cases:
1. Hook returns correct data for Day/Week/Month/Year views
2. Memoization works correctly (doesn't recalculate unnecessarily)
3. Loading states handled correctly
4. Error states handled correctly

---

## 9. Reasoning & Design Decisions

### 9.1 Why This Architecture?

1. **Reuses Existing Logic**: Calendar doesn't recalculate visibility; it uses pre-calculated fields from the database. This ensures consistency and performance.

2. **Consistent with Today/Upcoming**: Both views use `isVisibleToday()` and `isUpcoming()`. Calendar uses `isTaskVisible()` with a specific date - the same underlying logic.

3. **Clear Separation of Concerns**:
   - **Utilities** (`calendar.ts`): Pure functions, no React dependencies, easily testable.
   - **Hook** (`useCalendarTasks.ts`): React-specific data fetching and memoization.
   - **UI Components**: Focus on rendering only.

4. **Extensible for Travel Events**: The `DayTaskGroup` structure can easily accommodate travel events without changing core utilities.

5. **Timezone-Safe**: All date comparisons use `startOfDay()` from `date-fns`, avoiding timezone pitfalls.

### 9.2 Why Not Alternative Approaches?

**Alternative 1: Calculate visibility in UI**
- ❌ **Rejected**: Duplicates logic, inconsistent with Today/Upcoming, performance overhead.

**Alternative 2: Fetch tasks per day separately**
- ❌ **Rejected**: Too many database queries, inefficient, breaks offline-first caching.

**Alternative 3: Store calendar-specific data structure**
- ❌ **Rejected**: Adds complexity, requires new sync logic, violates single source of truth principle.

**Alternative 4: Use a calendar library (FullCalendar, etc.)**
- ✅ **Considered**: May be used for UI rendering, but data preparation follows this architecture.

---

## 10. Implementation Checklist

### Phase 1: Core Utilities (Foundation)
- [ ] Create `apps/desktop/src/utils/calendar.ts`
- [ ] Implement `getTasksForDateRange()`
- [ ] Implement `groupTasksByDay()`
- [ ] Implement `doesTaskIntersectDateRange()`
- [ ] Implement `getDayContextForTask()`
- [ ] Write unit tests for all utilities

### Phase 2: React Hook
- [ ] Create `apps/desktop/src/hooks/useCalendarTasks.ts`
- [ ] Implement `useCalendarTasks()` hook
- [ ] Add memoization logic
- [ ] Integrate with `useTaskStore()`
- [ ] Write integration tests

### Phase 3: Mobile Support
- [ ] Copy `calendar.ts` utilities to `apps/mobile/utils/`
- [ ] Copy `useCalendarTasks.ts` to `apps/mobile/hooks/`
- [ ] Adapt hook to use mobile task sync (if different)

### Phase 4: UI Implementation (Future)
- [ ] Create Calendar view components
- [ ] Implement Day/Week/Month/Year views
- [ ] Add navigation controls
- [ ] Add task interaction (click to edit, etc.)

---

## 11. Summary

This architecture provides:

✅ **Reuses visibility engine** - No recalculation, uses pre-calculated fields  
✅ **Consistent with Today/Upcoming** - Same filtering logic  
✅ **Clean separation** - Utilities → Hook → UI  
✅ **Multi-day span support** - Tasks appear on all days in their visibility range  
✅ **Recurring template filtering** - Only instances appear  
✅ **Timezone-safe** - Date-only comparisons  
✅ **Extensible** - Easy to add travel events later  
✅ **Performant** - Memoization and efficient filtering  
✅ **Testable** - Pure functions, clear interfaces  

**Next Step:** Implement Phase 1 (Core Utilities) and Phase 2 (React Hook) before building UI components.

