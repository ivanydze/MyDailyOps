# Calendar View Development Roadmap

**Version:** 1.1  
**Status:** Implementation Plan  
**Date:** 2025-01-12  
**Architecture:** Based on `CALENDAR_VIEW_ARCHITECTURE.md`

---

## 📋 Overview

This roadmap breaks down the Calendar View implementation into logical phases, from foundation utilities to full UI components. Each phase builds upon the previous one and includes clear integration points with existing systems.

---

## 🎯 Development Phases

### **PHASE 0: Prerequisites & Setup** ✅ (Already Complete)

**Status:** Pre-existing  
**Duration:** N/A

**Prerequisites:**
- ✅ Visibility engine implemented (`apps/desktop/src/utils/visibility.ts`)
- ✅ Recurring utilities implemented (`apps/desktop/src/utils/recurring.ts`)
- ✅ Task store implemented (`apps/desktop/src/stores/taskStore.ts`)
- ✅ Visibility fields in database (`visible_from`, `visible_until`, `duration_days`, `start_date`)

**No action required** - These are already in place.

---

### **PHASE 1: Core Calendar Utilities (Foundation)** 🔨

**Status:** Not Started  
**Duration:** ~4-6 hours  
**Priority:** Critical (Foundation)

#### 1.1 Create Core Utilities File

**File:** `apps/desktop/src/utils/calendar.ts`

**Purpose:** Pure utility functions with no React dependencies. These functions will be fully testable and reusable.

#### 1.2 Implement Type Definitions

**Types to define:**
```typescript
interface CalendarTaskQuery {
  startDate: Date;
  endDate: Date;
  includeCompleted?: boolean;
  userId: string;
}

interface CalendarTask {
  task: Task;
  visibleFrom: string;      // ISO date string (YYYY-MM-DD)
  visibleUntil: string;     // ISO date string (YYYY-MM-DD)
  spanDays: number;
}

interface DayTaskGroup {
  date: Date;
  dateKey: string;          // ISO date string (YYYY-MM-DD) for keying
  tasks: CalendarTask[];
}

interface TaskDayContext {
  dayIndex: number;         // 1-based: 1, 2, 3, ...
  totalDays: number;
  isFirstDay: boolean;
  isLastDay: boolean;
  isMiddleDay: boolean;
}
```

**Order:** First (before implementing functions)

#### 1.3 Implement `doesTaskIntersectDateRange()`

**Function:** `doesTaskIntersectDateRange(visibleFrom, visibleUntil, rangeStart, rangeEnd): boolean`

**Purpose:** Helper function to check if a task's visibility range intersects with a calendar date range.

**Integration Points:**
- **Visibility Engine:** Uses `parseISO()`, `startOfDay()` from `date-fns` (same as `visibility.ts`)
- **Logic:** Mirrors intersection logic from `isTaskVisible()` but for date ranges

**Dependencies:**
- `date-fns`: `parseISO`, `startOfDay`

**Test Requirements:**
- Tasks with full visibility range (visibleFrom && visibleUntil)
- Tasks with partial range (only visibleFrom or only visibleUntil)
- Tasks without visibility range (legacy behavior: always visible)
- Edge cases: null dates, invalid ranges, tasks spanning boundaries

#### 1.4 Implement `getTasksForDateRange()`

**Function:** `getTasksForDateRange(tasks: Task[], query: CalendarTaskQuery): CalendarTask[]`

**Purpose:** Filter and enrich tasks that intersect with a date range.

**Integration Points:**
- **Recurring Engine:** Uses `isRecurringTemplate(task)` from `apps/desktop/src/utils/recurring.ts` to filter out templates
- **Visibility Engine:** Uses `doesTaskIntersectDateRange()` (from 1.3) to check visibility
- **Task Model:** Reads `visible_from`, `visible_until` fields from Task objects

**Logic Flow:**
1. Filter out recurring templates (`isRecurringTemplate(task) === true`)
2. Filter out completed tasks (unless `includeCompleted === true`)
3. For each task, check intersection using `doesTaskIntersectDateRange()`
4. Enrich with `CalendarTask` metadata (calculate `spanDays`)

**Dependencies:**
- `isRecurringTemplate` from `recurring.ts`
- `doesTaskIntersectDateRange` (from 1.3)
- Task type with `visible_from`, `visible_until` fields

**Test Requirements:**
- Filters out recurring templates correctly
- Filters by date range correctly
- Includes/excludes completed tasks based on flag
- Calculates `spanDays` correctly
- Handles tasks with/without visibility ranges
- Handles edge cases (empty task list, invalid dates)

#### 1.5 Implement `groupTasksByDay()`

**Function:** `groupTasksByDay(calendarTasks: CalendarTask[], startDate: Date, endDate: Date): DayTaskGroup[]`

**Purpose:** Group tasks by the days they appear on, handling multi-day spans.

**Integration Points:**
- **Visibility Engine:** Uses `isTaskVisible(visibleFrom, visibleUntil, checkDate)` from `apps/desktop/src/utils/visibility.ts` for each day
- **Date-fns:** Uses `addDays()`, `isBefore()`, `isEqual()` to generate day range

**Logic Flow:**
1. Generate all days in range `[startDate, endDate]` (inclusive)
2. For each day, check which tasks are visible using `isTaskVisible()`
3. Create `DayTaskGroup` for each day with matching tasks
4. Return array of `DayTaskGroup` objects

**Multi-Day Span Handling:**
- Task with `visible_from = 2025-01-10`, `visible_until = 2025-01-14` appears in 5 `DayTaskGroup` objects
- Each group contains the same `CalendarTask` object reference

**Dependencies:**
- `isTaskVisible` from `visibility.ts`
- `date-fns`: `addDays`, `isBefore`, `isEqual`, `startOfDay`

**Test Requirements:**
- Groups single-day tasks correctly
- Groups multi-day tasks across all relevant days
- Handles tasks spanning month/year boundaries
- Handles empty task list
- Handles empty date range (same start/end date)
- Each task appears in correct days only

#### 1.6 Implement `getDayContextForTask()`

**Function:** `getDayContextForTask(task: CalendarTask, date: Date): TaskDayContext | null`

**Purpose:** Provide context information for a task on a specific day (e.g., "Day 3 of 5").

**Integration Points:**
- **Visibility Engine:** Uses `parseISO()`, `startOfDay()`, `differenceInDays()` from `date-fns`

**Logic Flow:**
1. If task has no `visibleFrom`/`visibleUntil`, return `null`
2. Calculate which day of the span `date` represents (1-based index)
3. Determine if it's first, last, or middle day
4. Return `TaskDayContext` object

**Dependencies:**
- `date-fns`: `parseISO`, `startOfDay`, `differenceInDays`

**Test Requirements:**
- Calculates day index correctly (1-based)
- Identifies first day correctly
- Identifies last day correctly
- Identifies middle days correctly
- Returns `null` for tasks without visibility range
- Handles edge cases (single-day tasks)

#### 1.7 Unit Tests for Core Utilities

**File:** `apps/desktop/src/utils/__tests__/calendar.test.ts`

**Coverage:**
- All functions from 1.3-1.6
- Edge cases and boundary conditions
- Integration with visibility engine (mocked or real)
- Integration with recurring engine (mocked or real)

**Test Framework:** Jest/Vitest (as per project setup)

---

### **PHASE 2: React Hook for Calendar Data** ⚛️

**Status:** Not Started  
**Duration:** ~3-4 hours  
**Priority:** Critical (Required before UI)

#### 2.1 Create Hook File

**File:** `apps/desktop/src/hooks/useCalendarTasks.ts`

**Purpose:** React hook that provides calendar-ready task data with memoization and loading states.

#### 2.2 Define Hook Interfaces

**Types:**
```typescript
interface UseCalendarTasksOptions {
  view: 'day' | 'week' | 'month' | 'year';
  centerDate: Date;
  includeCompleted?: boolean;
}

interface UseCalendarTasksReturn {
  dayGroups: DayTaskGroup[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

#### 2.3 Implement Date Range Calculation

**Function:** `calculateDateRange(view, centerDate): { startDate: Date, endDate: Date }`

**Purpose:** Calculate start/end dates based on view type and center date.

**Integration Points:**
- **Date-fns:** Uses `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear`

**Logic:**
- **Day:** `startDate = centerDate`, `endDate = centerDate`
- **Week:** `startDate = startOfWeek(centerDate)`, `endDate = endOfWeek(centerDate)`
- **Month:** `startDate = startOfMonth(centerDate)`, `endDate = endOfMonth(centerDate)`
- **Year:** `startDate = startOfYear(centerDate)`, `endDate = endOfYear(centerDate)`

**Dependencies:**
- `date-fns`: `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear`

#### 2.4 Implement `useCalendarTasks()` Hook

**Function:** `useCalendarTasks(options: UseCalendarTasksOptions): UseCalendarTasksReturn`

**Integration Points:**
- **Task Store:** Uses `useTaskStore()` hook from `apps/desktop/src/stores/taskStore.ts`
- **Core Utilities:** Uses `getTasksForDateRange()` and `groupTasksByDay()` from Phase 1
- **User Auth:** Gets `userId` from task store or auth context

**Logic Flow:**
1. Get `userId` from task store or auth context
2. Calculate `startDate`/`endDate` using date range calculation (2.3)
3. Get tasks from `useTaskStore()` hook
4. Call `getTasksForDateRange(tasks, { startDate, endDate, includeCompleted, userId })`
5. Call `groupTasksByDay(calendarTasks, startDate, endDate)`
6. Return `dayGroups` with loading/error states

**Memoization:**
- Use `useMemo()` for `dayGroups` calculation
- Dependencies: `tasks`, `startDate`, `endDate`, `includeCompleted`, `userId`
- Prevents recalculation on every render

**Loading States:**
- `isLoading`: From `useTaskStore().isLoading`
- `error`: From `useTaskStore().error`
- `refresh`: Wraps `useTaskStore().fetchTasks()`

**Dependencies:**
- `useTaskStore` from `taskStore.ts`
- `getTasksForDateRange`, `groupTasksByDay` from `calendar.ts` (Phase 1)
- React: `useMemo`, `useEffect` (if needed for refresh logic)

#### 2.5 Integration Tests for Hook

**File:** `apps/desktop/src/hooks/__tests__/useCalendarTasks.test.ts`

**Test Framework:** React Testing Library + Jest/Vitest

**Test Cases:**
- Hook returns correct data for Day view
- Hook returns correct data for Week view
- Hook returns correct data for Month view
- Hook returns correct data for Year view
- Memoization works (doesn't recalculate on unrelated state changes)
- Loading states propagated correctly
- Error states propagated correctly
- `refresh()` function works correctly
- Date range calculation for each view type

**Mocking:**
- Mock `useTaskStore()` to return test tasks
- Verify calls to `getTasksForDateRange()` and `groupTasksByDay()`

---

### **PHASE 3: Mobile App Support** 📱

**Status:** Not Started  
**Duration:** ~2-3 hours  
**Priority:** High (Consistency)

#### 3.1 Copy Core Utilities to Mobile

**File:** `apps/mobile/utils/calendar.ts`

**Action:** Copy entire file from `apps/desktop/src/utils/calendar.ts`

**Verification:**
- All functions work identically
- Type definitions match
- No desktop-specific imports

#### 3.2 Copy Hook to Mobile

**File:** `apps/mobile/hooks/useCalendarTasks.ts`

**Action:** Copy from `apps/desktop/src/hooks/useCalendarTasks.ts`

#### 3.3 Adapt Hook for Mobile Task Sync

**Changes Required:**
- Replace `useTaskStore()` with mobile equivalent (`useSync()` from `apps/mobile/hooks/useSync.ts`)
- Verify `userId` retrieval method matches mobile app pattern
- Ensure loading/error states align with mobile sync pattern

**Integration Points:**
- **Mobile Sync:** `useSync()` hook provides tasks
- **Mobile Auth:** Get `userId` from mobile auth context

**Testing:**
- Verify hook works with mobile task structure
- Test with mobile-specific edge cases

---

### **PHASE 4: UI Components - Foundation** 🎨

**Status:** Not Started  
**Duration:** ~6-8 hours  
**Priority:** High (User-facing)

#### 4.1 Create Calendar Components Directory

**Directory:** `apps/desktop/src/components/calendar/`

**Purpose:** Organized location for all calendar UI components.

#### 4.2 Implement `TaskCalendarItem` Component

**File:** `apps/desktop/src/components/calendar/TaskCalendarItem.tsx`

**Purpose:** Reusable component for rendering a single task in calendar views.

**Props:**
```typescript
interface TaskCalendarItemProps {
  task: CalendarTask;
  date: Date;                    // The day this task appears on
  context?: TaskDayContext;      // Optional: "Day 3 of 5" context
  onClick?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
}
```

**Features:**
- Display task title, priority, category
- Show completion checkbox
- Optional: Show day context label (e.g., "Day 3 of 5")
- Click handler for task details/edit
- Visual styling for priority, completion status

**Integration Points:**
- Uses `getDayContextForTask()` from Phase 1 if context not provided
- Integrates with task store for status updates

#### 4.3 Implement `CalendarDay` Component

**File:** `apps/desktop/src/components/calendar/CalendarDay.tsx`

**Purpose:** Component for rendering a single day in calendar views.

**Props:**
```typescript
interface CalendarDayProps {
  dayGroup: DayTaskGroup;
  isToday?: boolean;
  isSelected?: boolean;
  onDateClick?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
  TaskItemComponent?: React.ComponentType<TaskCalendarItemProps>;
}
```

**Features:**
- Display date (day number, weekday)
- Render all tasks for that day using `TaskCalendarItem`
- Visual indicators for today, selected date
- Click handlers for date selection, task interaction

**Integration Points:**
- Uses `TaskCalendarItem` component (4.2)
- Receives `DayTaskGroup` from `useCalendarTasks()` hook

---

### **PHASE 5: UI Components - Day View** 📅

**Status:** Not Started  
**Duration:** ~3-4 hours  
**Priority:** High (First view to implement)

#### 5.1 Implement Day View Component

**File:** `apps/desktop/src/components/calendar/CalendarDayView.tsx`

**Purpose:** Full day view showing single day with all tasks.

**Props:**
```typescript
interface CalendarDayViewProps {
  date: Date;
  includeCompleted?: boolean;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
}
```

**Features:**
- Display selected date prominently
- Show all tasks for that day
- Navigation: Previous/Next day buttons
- Date picker for quick navigation
- Empty state when no tasks

**Integration Points:**
- Uses `useCalendarTasks({ view: 'day', centerDate: date })` hook
- Uses `CalendarDay` component (Phase 4.3)
- Integrates with routing for task edit/details

#### 5.2 Create Day View Screen

**File:** `apps/desktop/src/screens/CalendarDay.tsx` (or integrate into main Calendar.tsx)

**Purpose:** Full-screen day view with navigation and controls.

**Features:**
- Header with date selector
- Previous/Next day navigation
- Task list for selected day
- "Add Task" button
- Integration with app routing

---

### **PHASE 6: UI Components - Week View** 📆

**Status:** Not Started  
**Duration:** ~4-5 hours  
**Priority:** High (Common use case)

#### 6.1 Implement Week View Component

**File:** `apps/desktop/src/components/calendar/CalendarWeekView.tsx`

**Purpose:** Week view showing 7 days in a grid layout.

**Props:**
```typescript
interface CalendarWeekViewProps {
  weekStartDate: Date;           // First day of week (Sunday or Monday)
  includeCompleted?: boolean;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
}
```

**Features:**
- 7-column grid (one per day)
- Each column shows `CalendarDay` component
- Week header with date range
- Navigation: Previous/Next week buttons
- Multi-day tasks span across columns visually

**Integration Points:**
- Uses `useCalendarTasks({ view: 'week', centerDate: weekStartDate })` hook
- Uses `CalendarDay` component for each day
- Handles multi-day task rendering across columns

#### 6.2 Week View Screen

**File:** `apps/desktop/src/screens/CalendarWeek.tsx` (or integrate into main Calendar.tsx)

**Purpose:** Full-screen week view with navigation.

---

### **PHASE 7: UI Components - Month View** 📆

**Status:** Not Started  
**Duration:** ~5-6 hours  
**Priority:** High (Most common view)

#### 7.1 Implement Month View Component

**File:** `apps/desktop/src/components/calendar/CalendarMonthView.tsx`

**Purpose:** Month view showing full calendar grid (like traditional calendar).

**Props:**
```typescript
interface CalendarMonthViewProps {
  month: Date;                   // Any date in the month
  includeCompleted?: boolean;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
}
```

**Features:**
- Calendar grid: 7 columns (days of week), ~5-6 rows (weeks)
- Each cell shows day number and tasks
- Previous/next month navigation
- Month/year selector
- Multi-day tasks displayed across cells
- Overflow indicator (e.g., "+3 more") for days with many tasks

**Integration Points:**
- Uses `useCalendarTasks({ view: 'month', centerDate: month })` hook
- Uses `CalendarDay` component for each day cell
- Optimized rendering for performance (many days)

#### 7.2 Month View Screen

**File:** `apps/desktop/src/screens/CalendarMonth.tsx` (or integrate into main Calendar.tsx)

**Purpose:** Full-screen month view.

---

### **PHASE 8: UI Components - Year View** 📆

**Status:** Not Started  
**Duration:** ~4-5 hours  
**Priority:** Medium (Less common, but useful)

#### 8.1 Implement Year View Component

**File:** `apps/desktop/src/components/calendar/CalendarYearView.tsx`

**Purpose:** Year view showing 12 months in a grid.

**Props:**
```typescript
interface CalendarYearViewProps {
  year: number;
  includeCompleted?: boolean;
  onMonthClick?: (month: Date) => void;
  onDateChange?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
}
```

**Features:**
- 12-month grid (3x4 or 4x3 layout)
- Each month shows mini calendar with task indicators
- Click month to navigate to month view
- Previous/next year navigation
- Year selector

**Performance Considerations:**
- Use virtual scrolling for months if needed
- Lazy load tasks for months not in viewport
- Show task count indicators rather than full task lists

**Integration Points:**
- Uses `useCalendarTasks({ view: 'year', centerDate: yearStart })` hook
- May need optimized data fetching (lazy loading)

#### 8.2 Year View Screen

**File:** `apps/desktop/src/screens/CalendarYear.tsx` (or integrate into main Calendar.tsx)

---

### **PHASE 9: Main Calendar Screen & Navigation** 🧭

**Status:** Not Started  
**Duration:** ~3-4 hours  
**Priority:** High (Unified entry point)

#### 9.1 Create Main Calendar Screen

**File:** `apps/desktop/src/screens/Calendar.tsx`

**Purpose:** Unified calendar screen with view switching.

**Features:**
- View selector: Day / Week / Month / Year
- Date navigation controls
- Current date indicator
- View-specific components (Day/Week/Month/Year)
- Routing integration
- Settings: Include completed tasks toggle

**State Management:**
- Current view type (day/week/month/year)
- Selected date
- Include completed flag

**Integration Points:**
- Routes to `CalendarDayView`, `CalendarWeekView`, `CalendarMonthView`, `CalendarYearView`
- Uses `useCalendarTasks()` hook internally
- Integrates with app navigation/routing

#### 9.2 Add Calendar Route

**File:** Update routing configuration (e.g., `App.tsx` or router config)

**Route:** `/calendar` or `/calendar/:view?/:date?`

**Navigation:**
- Add Calendar link to main navigation
- Support deep linking to specific views/dates

---

### **PHASE 10: Mobile Calendar Screen** 📱

**Status:** Not Started  
**Duration:** ~4-5 hours  
**Priority:** High (Mobile parity)

#### 10.1 Create Mobile Calendar Screen

**File:** `apps/mobile/screens/CalendarScreen.tsx`

**Purpose:** Mobile-optimized calendar view.

**Features:**
- Mobile-friendly layout (vertical scrolling)
- Swipe gestures for navigation
- View switching (Day/Week/Month)
- Touch-optimized task interactions
- Bottom sheet for task details

**Integration Points:**
- Uses `useCalendarTasks()` hook (from Phase 3)
- Uses mobile-specific task components
- Integrates with mobile navigation stack

---

### **PHASE 11: Travel Events Integration** ✈️

**Status:** Not Started  
**Duration:** ~6-8 hours (Depends on travel events implementation)  
**Priority:** Future (Problem 16)

#### 11.1 Extend Type Definitions

**Update:** `DayTaskGroup` interface

**Change:**
```typescript
interface DayTaskGroup {
  date: Date;
  dateKey: string;
  tasks: CalendarTask[];
  travelEvents: TravelEvent[];  // NEW
}
```

**Travel Event Type:**
```typescript
interface TravelEvent {
  id: string;
  title: string;
  startDate: string;      // ISO date (YYYY-MM-DD)
  endDate: string;        // ISO date (YYYY-MM-DD)
  location?: string;
  userId: string;
}
```

#### 11.2 Create Travel Events Utilities

**File:** `apps/desktop/src/utils/travelEvents.ts` (or extend `calendar.ts`)

**Functions:**
- `getTravelEventsForDateRange(events: TravelEvent[], startDate: Date, endDate: Date): TravelEvent[]`
- `mergeTasksAndEvents(dayGroups: DayTaskGroup[], travelEvents: TravelEvent[]): DayTaskGroup[]`

**Integration Points:**
- Travel events store/hook (to be created in Problem 16)
- Merge with task `dayGroups` before rendering

#### 11.3 Update Hook for Travel Events

**File:** Update `useCalendarTasks.ts`

**Changes:**
- Accept optional `includeTravelEvents?: boolean`
- Fetch travel events from travel events store
- Merge events into `dayGroups` using merge function

#### 11.4 Update UI Components

**Files:** Update all calendar view components

**Changes:**
- Render travel events alongside tasks
- Visual distinction between tasks and travel events
- Travel event item component

**Note:** This phase depends on Problem 16 (Travel Events implementation). Do not start until travel events are implemented.

---

## 🔗 Integration Points Summary

### Visibility Engine
- **Phase 1.3, 1.4, 1.5:** Use `isTaskVisible()`, `parseISO()`, `startOfDay()` from `visibility.ts`
- **No modifications required** - Calendar consumes existing functions

### Recurring Engine
- **Phase 1.4:** Use `isRecurringTemplate()` from `recurring.ts` to filter templates
- **No modifications required** - Calendar uses existing utility

### Task Store
- **Phase 2.4:** Use `useTaskStore()` hook for task data
- **No modifications required** - Hook reads from existing store

### Travel Events (Future)
- **Phase 11:** Extend `DayTaskGroup` structure, add merge utilities
- **Dependencies:** Travel events store/hook must exist first

---

## ✅ Confirmation Checkpoints

These steps require user confirmation before proceeding:

### **Checkpoint 1: After Phase 1 (Core Utilities)**
**Action:** Review and test core utilities
- [ ] All functions implemented and working
- [ ] Unit tests passing
- [ ] Integration with visibility engine verified
- [ ] Integration with recurring engine verified

**Decision Point:** Proceed to Phase 2 (React Hook)?

---

### **Checkpoint 2: After Phase 2 (React Hook)**
**Action:** Review and test React hook
- [ ] Hook returns correct data for all view types
- [ ] Memoization working correctly
- [ ] Loading/error states handled
- [ ] Integration tests passing

**Decision Point:** Proceed to Phase 3 (Mobile) and Phase 4 (UI Foundation)?

---

### **Checkpoint 3: After Phase 4 (UI Foundation)**
**Action:** Review UI component structure
- [ ] `TaskCalendarItem` component working
- [ ] `CalendarDay` component working
- [ ] Visual design approved
- [ ] Task interactions working (click, toggle complete)

**Decision Point:** Proceed to Phase 5 (Day View)?

---

### **Checkpoint 4: After Phase 5 (Day View)**
**Action:** Review Day View implementation
- [ ] Day view displaying correctly
- [ ] Navigation working
- [ ] Task interactions working
- [ ] Performance acceptable

**Decision Point:** Proceed to Phase 6 (Week View)?

---

### **Checkpoint 5: After Phase 6 (Week View)**
**Action:** Review Week View implementation
- [ ] Week view displaying correctly
- [ ] Multi-day task rendering working
- [ ] Navigation working

**Decision Point:** Proceed to Phase 7 (Month View)?

---

### **Checkpoint 6: After Phase 7 (Month View)**
**Action:** Review Month View implementation
- [ ] Month view displaying correctly
- [ ] Performance acceptable (many days/tasks)
- [ ] Multi-day task rendering working
- [ ] Overflow indicators working

**Decision Point:** Proceed to Phase 8 (Year View)?

---

### **Checkpoint 7: After Phase 8 (Year View)**
**Action:** Review Year View implementation
- [ ] Year view displaying correctly
- [ ] Performance acceptable (virtual scrolling if needed)
- [ ] Navigation working

**Decision Point:** Proceed to Phase 9 (Main Calendar Screen)?

---

### **Checkpoint 8: After Phase 9 (Main Calendar Screen)**
**Action:** Review complete calendar implementation
- [ ] View switching working
- [ ] Navigation integrated
- [ ] Routing working
- [ ] Settings working (include completed toggle)

**Decision Point:** Proceed to Phase 10 (Mobile Calendar)?

---

### **Checkpoint 9: After Phase 10 (Mobile Calendar)**
**Action:** Review mobile calendar implementation
- [ ] Mobile layout optimized
- [ ] Gestures working
- [ ] Performance acceptable

**Decision Point:** Calendar View complete? Ready for Phase 11 (Travel Events) when Problem 16 is implemented?

---

## 📊 Implementation Order Summary

```
Phase 0: Prerequisites ✅ (Already Complete)
    ↓
Phase 1: Core Utilities 🔨 (Foundation)
    ↓ [Checkpoint 1]
Phase 2: React Hook ⚛️
    ↓ [Checkpoint 2]
Phase 3: Mobile Support 📱 ──┐
    ↓                        │
Phase 4: UI Foundation 🎨 ←──┘ (Parallel with Phase 3)
    ↓ [Checkpoint 3]
Phase 5: Day View 📅
    ↓ [Checkpoint 4]
Phase 6: Week View 📆
    ↓ [Checkpoint 5]
Phase 7: Month View 📆
    ↓ [Checkpoint 6]
Phase 8: Year View 📆
    ↓ [Checkpoint 7]
Phase 9: Main Calendar Screen 🧭
    ↓ [Checkpoint 8]
Phase 10: Mobile Calendar 📱
    ↓ [Checkpoint 9]
Phase 11: Travel Events ✈️ (Future - After Problem 16)
```

---

## 🧪 Testing Strategy by Phase

### Phase 1: Core Utilities
- **Unit Tests:** 100% coverage of utility functions
- **Test File:** `apps/desktop/src/utils/__tests__/calendar.test.ts`
- **Mock Requirements:** Mock date-fns if needed, but prefer real functions

### Phase 2: React Hook
- **Integration Tests:** Test hook with mocked task store
- **Test File:** `apps/desktop/src/hooks/__tests__/useCalendarTasks.test.ts`
- **Mock Requirements:** Mock `useTaskStore()`

### Phase 3: Mobile Support
- **Manual Testing:** Verify utilities work identically on mobile
- **Hook Testing:** Test with mobile task sync

### Phase 4-10: UI Components
- **Component Tests:** Test rendering, interactions
- **E2E Tests:** Test navigation, task interactions
- **Visual Regression:** Screenshot comparisons (if tool available)

### Phase 11: Travel Events
- **Integration Tests:** Test merging logic
- **UI Tests:** Test travel event rendering

---

## 📝 Notes

1. **No UI Implementation Until Phase 4:** Foundation utilities and hook must be complete and tested first.

2. **Travel Events Deferred:** Phase 11 cannot start until Problem 16 (Travel Events) is implemented.

3. **Mobile Parity:** Mobile support (Phase 3) can be done in parallel with UI foundation (Phase 4) since they share the same utilities.

4. **View Implementation Order:** Day → Week → Month → Year is recommended because:
   - Day is simplest (fewest tasks, easiest to debug)
   - Week builds on day (7 days)
   - Month builds on week (many days, performance considerations)
   - Year is most complex (12 months, virtual scrolling)

5. **Performance Optimization:** Consider virtual scrolling and lazy loading early, especially for Month and Year views.

6. **Accessibility:** Ensure all components are keyboard navigable and screen reader friendly (add to Phase 4-10).

---

## 🎯 Success Criteria

Calendar View is considered complete when:
- ✅ All core utilities implemented and tested
- ✅ React hook implemented and tested
- ✅ All four views (Day/Week/Month/Year) implemented
- ✅ Main calendar screen with view switching working
- ✅ Mobile calendar implemented
- ✅ Integration with visibility engine verified
- ✅ Integration with recurring engine verified
- ✅ All tests passing
- ✅ Performance acceptable (< 200ms for month view)

---

**Next Step:** Begin Phase 1 (Core Utilities) after user confirmation.

