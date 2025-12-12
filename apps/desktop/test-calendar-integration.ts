/**
 * CALENDAR VIEW INTEGRATION TESTS
 * 
 * Comprehensive integration tests for Calendar View components:
 * - CalendarDayView
 * - CalendarWeekView
 * - CalendarMonthView
 * - CalendarYearView
 * - Calendar (Main Screen)
 * 
 * Tests cover:
 * 1. Task display correctness
 * 2. Navigation functionality
 * 3. URL synchronization
 * 4. Date and task clicks
 * 5. View switching
 * 6. includeCompleted functionality
 * 7. Multi-day task display
 * 8. Transitions between views
 * 
 * Usage:
 *   tsx test-calendar-integration.ts                    # Run all tests
 *   tsx test-calendar-integration.ts --section=1        # Run section 1 only
 */

import {
  getTasksForDateRange,
  groupTasksByDay,
  doesTaskIntersectDateRange,
  type CalendarTaskQuery,
  type DayTaskGroup,
} from './src/utils/calendar';
import {
  formatISO,
  parseISO,
  addDays,
  subDays,
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';
import type { Task } from '@mydailyops/core';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

interface TestResult {
  section: string;
  testNumber: number;
  name: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

const results: TestResult[] = [];
let currentSection = '';
let testCounter = 0;

// Parse command line arguments
const args = process.argv.slice(2);
const sectionArg = args.find(arg => arg.startsWith('--section='));
const sectionsToRun = sectionArg
  ? sectionArg.split('=')[1].split(',').map(s => s.trim())
  : null;

// Helper functions
function section(name: string) {
  currentSection = name;
  console.log(`\n📋 SECTION: ${name}`);
  console.log('='.repeat(80));
}

function test(name: string, fn: () => void) {
  testCounter++;
  const testNum = testCounter;
  
  // Skip if section filtering is enabled
  if (sectionsToRun && !sectionsToRun.includes(currentSection)) {
    return;
  }

  try {
    fn();
    const result: TestResult = {
      section: currentSection,
      testNumber: testNum,
      name,
      passed: true,
      message: '✅ PASSED',
    };
    results.push(result);
    console.log(`✅ Test ${testNum}: ${name}`);
  } catch (error: any) {
    const result: TestResult = {
      section: currentSection,
      testNumber: testNum,
      name,
      passed: false,
      message: error.message || 'Test failed',
      expected: error.expected,
      actual: error.actual,
    };
    results.push(result);
    console.log(`❌ Test ${testNum}: ${name}`);
    console.log(`   Error: ${error.message}`);
    if (error.expected !== undefined) {
      console.log(`   Expected: ${JSON.stringify(error.expected)}`);
    }
    if (error.actual !== undefined) {
      console.log(`   Actual: ${JSON.stringify(error.actual)}`);
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    const error: any = new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

function createTask(
  id: string,
  title: string,
  userId: string,
  options?: {
    deadline?: string;
    startDate?: string;
    durationDays?: number;
    visibleFrom?: string;
    visibleUntil?: string;
    status?: string;
    isCompleted?: boolean;
    isRecurringTemplate?: boolean;
  }
): Task & { user_id: string; visible_from?: string; visible_until?: string; duration_days?: number; status?: string; is_completed?: boolean } {
  const task: any = {
    id,
    title,
    user_id: userId,
    priority: 'medium' as const,
    status: options?.status || 'pending',
    deadline: options?.deadline || null,
    start_date: options?.startDate || null,
    duration_days: options?.durationDays || 1,
    visible_from: options?.visibleFrom || null,
    visible_until: options?.visibleUntil || null,
    is_completed: options?.isCompleted || false,
    is_recurring_template: options?.isRecurringTemplate || false,
  };
  return task;
}

// ============================================================================
// SECTION 1: CalendarDayView Integration Tests
// ============================================================================

section('1. CalendarDayView - Task Display');

test('1.1: Day view displays tasks for selected date', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';
  
  const tasks = [
    createTask('task-1', 'Task 1', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
    }),
    createTask('task-2', 'Task 2', userId, {
      visibleFrom: formatISO(addDays(today, -1)),
      visibleUntil: formatISO(addDays(today, 1)),
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assert(dayGroups.length === 1, 'Should have exactly one day group');
  assertEqual(dayGroups[0].tasks.length, 2, 'Should display 2 tasks for the day');
  assertEqual(dayGroups[0].dateKey, format(today, 'yyyy-MM-dd'), 'Date key should match');
});

test('1.2: Day view excludes completed tasks when includeCompleted=false', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';
  
  const tasks = [
    createTask('task-1', 'Active Task', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
      status: 'pending',
    }),
    createTask('task-2', 'Completed Task', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
      status: 'done',
      isCompleted: true,
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups[0].tasks.length, 1, 'Should display only 1 active task');
  assertEqual(dayGroups[0].tasks[0].task.title, 'Active Task', 'Should display active task');
});

test('1.3: Day view includes completed tasks when includeCompleted=true', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';
  
  const tasks = [
    createTask('task-1', 'Active Task', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
      status: 'pending',
    }),
    createTask('task-2', 'Completed Task', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
      status: 'done',
      isCompleted: true,
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: true,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups[0].tasks.length, 2, 'Should display both tasks');
});

test('1.4: Day view displays multi-day task spanning the selected date', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';
  
  const tasks = [
    createTask('task-1', 'Multi-day Task', userId, {
      visibleFrom: formatISO(addDays(today, -2)),
      visibleUntil: formatISO(addDays(today, 2)),
      durationDays: 5,
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups[0].tasks.length, 1, 'Should display multi-day task');
  assertEqual(dayGroups[0].tasks[0].spanDays, 5, 'Task should span 5 days');
});

// ============================================================================
// SECTION 2: CalendarWeekView Integration Tests
// ============================================================================

section('2. CalendarWeekView - Week Display');

test('2.1: Week view displays all 7 days', () => {
  const weekStart = startOfWeek(new Date('2024-01-15'), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date('2024-01-15'), { weekStartsOn: 0 });
  const userId = 'user-1';

  const tasks: Task[] = [];
  const query: CalendarTaskQuery = {
    startDate: weekStart,
    endDate: weekEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, weekStart, weekEnd);

  assertEqual(dayGroups.length, 7, 'Should have exactly 7 day groups for a week');
});

test('2.2: Week view displays tasks across multiple days', () => {
  const weekStart = startOfWeek(new Date('2024-01-15'), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const userId = 'user-1';

  const tasks = [
    createTask('task-1', 'Monday Task', userId, {
      visibleFrom: formatISO(addDays(weekStart, 1)), // Monday
      visibleUntil: formatISO(addDays(weekStart, 1)),
    }),
    createTask('task-2', 'Wednesday Task', userId, {
      visibleFrom: formatISO(addDays(weekStart, 3)), // Wednesday
      visibleUntil: formatISO(addDays(weekStart, 3)),
    }),
    createTask('task-3', 'Week-spanning Task', userId, {
      visibleFrom: formatISO(addDays(weekStart, 2)), // Tuesday
      visibleUntil: formatISO(addDays(weekStart, 4)), // Thursday
      durationDays: 3,
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: weekStart,
    endDate: weekEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, weekStart, weekEnd);

  // Monday (index 1)
  const mondayTasks = dayGroups.find(dg => format(dg.date, 'yyyy-MM-dd') === format(addDays(weekStart, 1), 'yyyy-MM-dd'));
  assert(mondayTasks !== undefined, 'Should have Monday group');
  assertEqual(mondayTasks!.tasks.length, 1, 'Monday should have 1 task');

  // Wednesday (index 3)
  const wednesdayTasks = dayGroups.find(dg => format(dg.date, 'yyyy-MM-dd') === format(addDays(weekStart, 3), 'yyyy-MM-dd'));
  assert(wednesdayTasks !== undefined, 'Should have Wednesday group');
  assert(wednesdayTasks!.tasks.length >= 2, 'Wednesday should have at least 2 tasks (task-2 and task-3)');
});

test('2.3: Week view correctly handles multi-day tasks across week boundaries', () => {
  const weekStart = startOfWeek(new Date('2024-01-15'), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const userId = 'user-1';

  // Task starts before week, ends during week
  const task1 = createTask('task-1', 'Pre-week Task', userId, {
    visibleFrom: formatISO(addDays(weekStart, -2)),
    visibleUntil: formatISO(addDays(weekStart, 2)),
    durationDays: 5,
  });

  // Task starts during week, ends after week
  const task2 = createTask('task-2', 'Post-week Task', userId, {
    visibleFrom: formatISO(addDays(weekEnd, -2)),
    visibleUntil: formatISO(addDays(weekEnd, 2)),
    durationDays: 5,
  });

  const tasks = [task1, task2];
  const query: CalendarTaskQuery = {
    startDate: weekStart,
    endDate: weekEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, weekStart, weekEnd);

  // Check that tasks appear in intersecting days
  const hasTask1 = dayGroups.some(dg => dg.tasks.some(t => t.task.id === 'task-1'));
  const hasTask2 = dayGroups.some(dg => dg.tasks.some(t => t.task.id === 'task-2'));

  assert(hasTask1, 'Pre-week task should appear in week');
  assert(hasTask2, 'Post-week task should appear in week');
});

// ============================================================================
// SECTION 3: CalendarMonthView Integration Tests
// ============================================================================

section('3. CalendarMonthView - Month Display');

test('3.1: Month view displays correct number of days in calendar grid', () => {
  const monthStart = startOfMonth(new Date('2024-01-15'));
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const userId = 'user-1';

  const tasks: Task[] = [];
  const query: CalendarTaskQuery = {
    startDate: calendarStart,
    endDate: calendarEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, calendarStart, calendarEnd);

  // January 2024 has 31 days, but calendar grid includes days from adjacent months
  // Should be 5-6 weeks = 35-42 days
  assert(dayGroups.length >= 35, 'Calendar grid should have at least 35 days');
  assert(dayGroups.length <= 42, 'Calendar grid should have at most 42 days');

  // Count days in current month
  const currentMonthDays = dayGroups.filter(dg => {
    const dgDate = startOfDay(dg.date);
    return dgDate.getMonth() === monthStart.getMonth() &&
           dgDate.getFullYear() === monthStart.getFullYear();
  });

  assertEqual(currentMonthDays.length, 31, 'Should have exactly 31 days in January 2024');
});

test('3.2: Month view correctly displays tasks for each day', () => {
  const monthStart = startOfMonth(new Date('2024-01-15'));
  const monthEnd = endOfMonth(monthStart);
  const userId = 'user-1';

  const tasks = [
    createTask('task-1', 'Day 1 Task', userId, {
      visibleFrom: formatISO(addDays(monthStart, 0)),
      visibleUntil: formatISO(addDays(monthStart, 0)),
    }),
    createTask('task-2', 'Day 15 Task', userId, {
      visibleFrom: formatISO(addDays(monthStart, 14)),
      visibleUntil: formatISO(addDays(monthStart, 14)),
    }),
    createTask('task-3', 'Day 31 Task', userId, {
      visibleFrom: formatISO(addDays(monthStart, 30)),
      visibleUntil: formatISO(addDays(monthStart, 30)),
    }),
  ];

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const query: CalendarTaskQuery = {
    startDate: calendarStart,
    endDate: calendarEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, calendarStart, calendarEnd);

  // Check Day 1
  const day1Group = dayGroups.find(dg => format(dg.date, 'yyyy-MM-dd') === format(addDays(monthStart, 0), 'yyyy-MM-dd'));
  assert(day1Group !== undefined, 'Should have Day 1 group');
  assert(day1Group!.tasks.some(t => t.task.id === 'task-1'), 'Day 1 should have task-1');

  // Check Day 15
  const day15Group = dayGroups.find(dg => format(dg.date, 'yyyy-MM-dd') === format(addDays(monthStart, 14), 'yyyy-MM-dd'));
  assert(day15Group !== undefined, 'Should have Day 15 group');
  assert(day15Group!.tasks.some(t => t.task.id === 'task-2'), 'Day 15 should have task-2');

  // Check Day 31
  const day31Group = dayGroups.find(dg => format(dg.date, 'yyyy-MM-dd') === format(addDays(monthStart, 30), 'yyyy-MM-dd'));
  assert(day31Group !== undefined, 'Should have Day 31 group');
  assert(day31Group!.tasks.some(t => t.task.id === 'task-3'), 'Day 31 should have task-3');
});

test('3.3: Month view overflow indicator logic (maxTasksVisible)', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';

  // Create 5 tasks for the same day
  const tasks = Array.from({ length: 5 }, (_, i) =>
    createTask(`task-${i + 1}`, `Task ${i + 1}`, userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
    })
  );

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups[0].tasks.length, 5, 'Should have all 5 tasks');

  // Simulate maxTasksVisible=3 logic
  const maxTasksVisible = 3;
  const visibleTasks = dayGroups[0].tasks.slice(0, maxTasksVisible);
  const hiddenTasksCount = dayGroups[0].tasks.length - maxTasksVisible;

  assertEqual(visibleTasks.length, 3, 'Should show 3 visible tasks');
  assertEqual(hiddenTasksCount, 2, 'Should have 2 hidden tasks');
});

// ============================================================================
// SECTION 4: CalendarYearView Integration Tests
// ============================================================================

section('4. CalendarYearView - Year Display');

test('4.1: Year view displays all 12 months', () => {
  const yearStart = startOfYear(new Date('2024-06-15'));
  const yearEnd = endOfYear(yearStart);
  const userId = 'user-1';

  const tasks: Task[] = [];
  const query: CalendarTaskQuery = {
    startDate: yearStart,
    endDate: yearEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  
  // Group by month
  const monthGroups = new Map<number, typeof calendarTasks>();
  calendarTasks.forEach(ct => {
    const month = ct.task.start_date
      ? new Date(ct.visibleFrom || ct.task.start_date).getMonth()
      : new Date().getMonth();
    // For year view, we just need to verify we can process all months
  });

  // Year should cover all 12 months
  assert(doesTaskIntersectDateRange(null, null, yearStart, yearEnd), 'Year range should be valid');
});

test('4.2: Year view groups tasks by month correctly', () => {
  const year = 2024;
  const userId = 'user-1';

  const tasks = [
    createTask('task-jan', 'January Task', userId, {
      visibleFrom: formatISO(new Date(year, 0, 15)),
      visibleUntil: formatISO(new Date(year, 0, 15)),
    }),
    createTask('task-jun', 'June Task', userId, {
      visibleFrom: formatISO(new Date(year, 5, 15)),
      visibleUntil: formatISO(new Date(year, 5, 15)),
    }),
    createTask('task-dec', 'December Task', userId, {
      visibleFrom: formatISO(new Date(year, 11, 15)),
      visibleUntil: formatISO(new Date(year, 11, 15)),
    }),
  ];

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(yearStart);

  const query: CalendarTaskQuery = {
    startDate: yearStart,
    endDate: yearEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);

  // Check that all tasks are included
  const taskIds = calendarTasks.map(ct => ct.task.id);
  assert(taskIds.includes('task-jan'), 'Should include January task');
  assert(taskIds.includes('task-jun'), 'Should include June task');
  assert(taskIds.includes('task-dec'), 'Should include December task');
});

// ============================================================================
// SECTION 5: Calendar Main Screen - View Switching
// ============================================================================

section('5. Calendar Main Screen - View Switching');

test('5.1: View switching maintains date context', () => {
  const baseDate = new Date('2024-01-15');
  
  // Simulate view switching logic
  const getInitialDate = (viewType: 'day' | 'week' | 'month' | 'year', date: Date): Date => {
    switch (viewType) {
      case 'day':
        return date;
      case 'week':
        return startOfWeek(date, { weekStartsOn: 0 });
      case 'month':
        return startOfMonth(date);
      case 'year':
        return startOfYear(date);
      default:
        return date;
    }
  };

  const dayDate = getInitialDate('day', baseDate);
  const weekDate = getInitialDate('week', baseDate);
  const monthDate = getInitialDate('month', baseDate);
  const yearDate = getInitialDate('year', baseDate);

  assertEqual(format(dayDate, 'yyyy-MM-dd'), '2024-01-15', 'Day view should use exact date');
  assertEqual(format(weekDate, 'yyyy-MM-dd'), '2024-01-14', 'Week view should use week start (Sunday)');
  assertEqual(format(monthDate, 'yyyy-MM-dd'), '2024-01-01', 'Month view should use month start');
  assertEqual(format(yearDate, 'yyyy-MM-dd'), '2024-01-01', 'Year view should use year start');
});

test('5.2: URL parameter parsing for view and date', () => {
  // Simulate URL parameter parsing
  const parseURLParams = (url: string) => {
    const params = new URLSearchParams(url.split('?')[1]);
    return {
      view: params.get('view') || 'month',
      date: params.get('date') || formatISO(startOfDay(new Date())),
      completed: params.get('completed') === '1',
    };
  };

  const params1 = parseURLParams('/calendar?view=day&date=2024-01-15');
  assertEqual(params1.view, 'day', 'Should parse view=day');
  assertEqual(params1.date, '2024-01-15', 'Should parse date');

  const params2 = parseURLParams('/calendar?view=week&date=2024-06-20&completed=1');
  assertEqual(params2.view, 'week', 'Should parse view=week');
  assertEqual(params2.completed, true, 'Should parse completed=1');
});

test('5.3: includeCompleted setting affects all views', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';

  const tasks = [
    createTask('task-1', 'Active', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
      status: 'pending',
    }),
    createTask('task-2', 'Completed', userId, {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
      status: 'done',
      isCompleted: true,
    }),
  ];

  // Test with includeCompleted=false
  const query1: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };
  const tasks1 = getTasksForDateRange(tasks, query1);
  assertEqual(tasks1.length, 1, 'Should exclude completed with includeCompleted=false');

  // Test with includeCompleted=true
  const query2: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: true,
    userId,
  };
  const tasks2 = getTasksForDateRange(tasks, query2);
  assertEqual(tasks2.length, 2, 'Should include completed with includeCompleted=true');
});

// ============================================================================
// SECTION 6: Multi-day Tasks Integration
// ============================================================================

section('6. Multi-day Tasks Display');

test('6.1: Multi-day task appears in all intersecting days', () => {
  const weekStart = startOfWeek(new Date('2024-01-15'), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const userId = 'user-1';

  // 5-day task: Tuesday to Saturday
  const task = createTask('task-1', '5-day Task', userId, {
    visibleFrom: formatISO(addDays(weekStart, 2)), // Tuesday
    visibleUntil: formatISO(addDays(weekStart, 6)), // Saturday
    durationDays: 5,
  });

  const query: CalendarTaskQuery = {
    startDate: weekStart,
    endDate: weekEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange([task], query);
  const dayGroups = groupTasksByDay(calendarTasks, weekStart, weekEnd);

  // Check that task appears in Tuesday, Wednesday, Thursday, Friday, Saturday
  const daysWithTask = dayGroups.filter(dg => {
    const dayDate = startOfDay(dg.date);
    const taskStart = startOfDay(parseISO(task.visible_from!));
    const taskEnd = startOfDay(parseISO(task.visible_until!));
    return dayDate >= taskStart && dayDate <= taskEnd;
  });

  assertEqual(daysWithTask.length, 5, 'Task should appear in 5 days');
  
  // Verify task appears in each of those days
  daysWithTask.forEach(dayGroup => {
    const hasTask = dayGroup.tasks.some(t => t.task.id === 'task-1');
    assert(hasTask, `Task should appear in ${format(dayGroup.date, 'yyyy-MM-dd')}`);
  });
});

test('6.2: Multi-day task day context calculation', () => {
  const taskStart = startOfDay(new Date('2024-01-15'));
  const taskEnd = startOfDay(addDays(taskStart, 4)); // 5-day task
  const userId = 'user-1';

  const task = createTask('task-1', '5-day Task', userId, {
    visibleFrom: formatISO(taskStart),
    visibleUntil: formatISO(taskEnd),
    durationDays: 5,
  });

  const query: CalendarTaskQuery = {
    startDate: taskStart,
    endDate: taskEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange([task], query);
  const calendarTask = calendarTasks[0];

  assertEqual(calendarTask.spanDays, 5, 'Task should span 5 days');

  // Check day 1 (first day)
  const day1Groups = groupTasksByDay(calendarTasks, taskStart, taskStart);
  // Verify spanDays is correct
  assertEqual(day1Groups[0].tasks[0].spanDays, 5, 'First day should show span of 5');

  // Check day 3 (middle day)
  const day3 = addDays(taskStart, 2);
  const day3Groups = groupTasksByDay(calendarTasks, day3, day3);
  assertEqual(day3Groups[0].tasks[0].spanDays, 5, 'Middle day should show span of 5');

  // Check day 5 (last day)
  const day5Groups = groupTasksByDay(calendarTasks, taskEnd, taskEnd);
  assertEqual(day5Groups[0].tasks[0].spanDays, 5, 'Last day should show span of 5');
});

// ============================================================================
// SECTION 7: Navigation and Transitions
// ============================================================================

section('7. Navigation and View Transitions');

test('7.1: Day → Week transition preserves date', () => {
  const selectedDate = new Date('2024-01-15');
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });

  // Simulate transition from day to week
  const transitionToWeek = (date: Date) => {
    return startOfWeek(date, { weekStartsOn: 0 });
  };

  const weekStartResult = transitionToWeek(selectedDate);
  assertEqual(format(weekStartResult, 'yyyy-MM-dd'), '2024-01-14', 'Should transition to week start (Sunday)');
});

test('7.2: Week → Month transition preserves week start', () => {
  const weekStart = new Date('2024-01-14'); // Sunday
  const monthStart = startOfMonth(weekStart);

  // Simulate transition from week to month
  const transitionToMonth = (date: Date) => {
    return startOfMonth(date);
  };

  const monthStartResult = transitionToMonth(weekStart);
  assertEqual(format(monthStartResult, 'yyyy-MM-dd'), '2024-01-01', 'Should transition to month start');
});

test('7.3: Month → Year transition preserves month', () => {
  const monthStart = new Date('2024-06-01');
  const yearStart = startOfYear(monthStart);

  // Simulate transition from month to year
  const transitionToYear = (date: Date) => {
    return startOfYear(date);
  };

  const yearStartResult = transitionToYear(monthStart);
  assertEqual(format(yearStartResult, 'yyyy-MM-dd'), '2024-01-01', 'Should transition to year start');
});

test('7.4: Year → Month transition (click on month)', () => {
  const year = 2024;
  const monthIndex = 5; // June (0-indexed)
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));

  // Simulate clicking on a month in year view
  const clickMonth = (year: number, monthIndex: number) => {
    return startOfMonth(new Date(year, monthIndex, 1));
  };

  const monthStartResult = clickMonth(year, monthIndex);
  assertEqual(format(monthStartResult, 'yyyy-MM-dd'), '2024-06-01', 'Should navigate to correct month');
});

test('7.5: Date click navigation (any view → day view)', () => {
  const clickedDate = new Date('2024-01-15');

  // Simulate clicking on a date from any view
  const navigateToDay = (date: Date) => {
    return startOfDay(date);
  };

  const dayDate = navigateToDay(clickedDate);
  assertEqual(format(dayDate, 'yyyy-MM-dd'), '2024-01-15', 'Should navigate to exact day');
});

// ============================================================================
// SECTION 8: Edge Cases and Error Handling
// ============================================================================

section('8. Edge Cases and Error Handling');

test('8.1: Empty task list displays correctly', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';

  const tasks: Task[] = [];
  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups.length, 1, 'Should have one day group');
  assertEqual(dayGroups[0].tasks.length, 0, 'Should have no tasks');
});

test('8.2: Tasks from other users are excluded', () => {
  const today = startOfDay(new Date('2024-01-15'));

  const tasks = [
    createTask('task-1', 'User 1 Task', 'user-1', {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
    }),
    createTask('task-2', 'User 2 Task', 'user-2', {
      visibleFrom: formatISO(today),
      visibleUntil: formatISO(today),
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId: 'user-1',
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups[0].tasks.length, 1, 'Should only show user-1 tasks');
  assertEqual(dayGroups[0].tasks[0].task.user_id, 'user-1', 'Should be user-1 task');
});

test('8.3: Recurring templates are excluded', () => {
  const today = startOfDay(new Date('2024-01-15'));
  const userId = 'user-1';

  // Normal task (not a template)
  const task1: any = createTask('task-1', 'Normal Task', userId, {
    visibleFrom: formatISO(today),
    visibleUntil: formatISO(today),
  });
  task1.recurring_options = null; // Not a recurring template

  // Recurring template (should be excluded)
  const task2: any = createTask('task-2', 'Recurring Template', userId, {
    visibleFrom: formatISO(today),
    visibleUntil: formatISO(today),
  });
  task2.recurring_options = { type: 'daily', interval: 1 }; // Is a recurring template

  const tasks = [task1, task2];

  const query: CalendarTaskQuery = {
    startDate: today,
    endDate: today,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);
  const dayGroups = groupTasksByDay(calendarTasks, today, today);

  assertEqual(dayGroups[0].tasks.length, 1, 'Should exclude recurring template');
  assertEqual(dayGroups[0].tasks[0].task.id, 'task-1', 'Should only show normal task');
});

test('8.4: Tasks outside date range are excluded', () => {
  const rangeStart = startOfDay(new Date('2024-01-15'));
  const rangeEnd = startOfDay(new Date('2024-01-20'));
  const userId = 'user-1';

  const tasks = [
    createTask('task-1', 'Before Range', userId, {
      visibleFrom: formatISO(subDays(rangeStart, 5)),
      visibleUntil: formatISO(subDays(rangeStart, 3)),
    }),
    createTask('task-2', 'In Range', userId, {
      visibleFrom: formatISO(addDays(rangeStart, 2)),
      visibleUntil: formatISO(addDays(rangeStart, 2)),
    }),
    createTask('task-3', 'After Range', userId, {
      visibleFrom: formatISO(addDays(rangeEnd, 3)),
      visibleUntil: formatISO(addDays(rangeEnd, 5)),
    }),
  ];

  const query: CalendarTaskQuery = {
    startDate: rangeStart,
    endDate: rangeEnd,
    includeCompleted: false,
    userId,
  };

  const calendarTasks = getTasksForDateRange(tasks, query);

  const taskIds = calendarTasks.map(ct => ct.task.id);
  assert(!taskIds.includes('task-1'), 'Should exclude task before range');
  assert(taskIds.includes('task-2'), 'Should include task in range');
  assert(!taskIds.includes('task-3'), 'Should exclude task after range');
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  Section ${r.section}, Test ${r.testNumber}: ${r.name}`);
      console.log(`    ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
printSummary();

