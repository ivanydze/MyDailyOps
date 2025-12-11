/**
 * CALENDAR HOOK INTEGRATION TESTS
 * 
 * Integration tests for Phase 2: useCalendarTasks hook
 * 
 * Since React hooks require React Testing Library for proper testing,
 * this test file validates:
 * 1. Date range calculation logic (calculateDateRange)
 * 2. Integration of calendar utilities with task filtering
 * 3. End-to-end data flow (tasks -> filtered -> grouped)
 * 
 * Usage:
 *   tsx test-calendar-hook.ts                    # Run all tests
 *   tsx test-calendar-hook.ts --section=1        # Run section 1 only
 */

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  formatISO,
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
} from 'date-fns';
import {
  getTasksForDateRange,
  groupTasksByDay,
  type CalendarTaskQuery,
} from './src/utils/calendar';
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
  ? sectionArg.split('=')[1].split(',').map(s => parseInt(s.trim()))
  : null;

// ============================================================================
// TEST UTILITIES
// ============================================================================

function runTest(
  name: string,
  testFn: () => { passed: boolean; message: string; expected?: any; actual?: any }
): void {
  testCounter++;
  try {
    const result = testFn();
    results.push({
      section: currentSection,
      testNumber: testCounter,
      name,
      passed: result.passed,
      message: result.message,
      expected: result.expected,
      actual: result.actual,
    });

    if (result.passed) {
      console.log(`  ✅ ${testCounter}. ${name}`);
    } else {
      console.log(`  ❌ ${testCounter}. ${name}`);
      console.log(`     ${result.message}`);
      if (result.expected !== undefined && result.actual !== undefined) {
        console.log(`     Expected: ${JSON.stringify(result.expected)}`);
        console.log(`     Actual: ${JSON.stringify(result.actual)}`);
      }
    }
  } catch (error: any) {
    results.push({
      section: currentSection,
      testNumber: testCounter,
      name,
      passed: false,
      message: `Test failed with error: ${error.message}`,
    });
    console.log(`  ❌ ${testCounter}. ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

function shouldRunSection(sectionNumber: number): boolean {
  if (!sectionsToRun) return true;
  return sectionsToRun.includes(sectionNumber);
}

// Helper to create a test task
function createTestTask(overrides: any = {}): Task {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: overrides.title || 'Test Task',
    description: overrides.description || '',
    priority: overrides.priority || 'medium',
    category: overrides.category || '',
    dueDate: overrides.dueDate || null,
    isCompleted: overrides.isCompleted || false,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    isRecurring: overrides.isRecurring || false,
    recurringType: overrides.recurringType || undefined,
    recurringInterval: overrides.recurringInterval || undefined,
    recurringDaysOfWeek: overrides.recurringDaysOfWeek || undefined,
    recurringEndDate: overrides.recurringEndDate || undefined,
    parentRecurringId: overrides.parentRecurringId || undefined,
    recurring: overrides.recurring || undefined,
    recurring_options: overrides.recurring_options || null,
    // Extended fields
    user_id: overrides.user_id || 'test-user-1',
    status: overrides.status || 'pending',
    pinned: overrides.pinned || false,
    deadline: overrides.deadline || null,
    visible_from: overrides.visible_from || null,
    visible_until: overrides.visible_until || null,
    duration_days: overrides.duration_days || null,
    start_date: overrides.start_date || null,
  } as Task;
}

// ============================================================================
// SECTION 1: DATE RANGE CALCULATION
// ============================================================================

function calculateDateRange(
  view: 'day' | 'week' | 'month' | 'year',
  centerDate: Date
): { startDate: Date; endDate: Date } {
  switch (view) {
    case 'day':
      return { startDate: centerDate, endDate: centerDate };
    case 'week':
      return {
        startDate: startOfWeek(centerDate, { weekStartsOn: 0 }),
        endDate: endOfWeek(centerDate, { weekStartsOn: 0 }),
      };
    case 'month':
      return {
        startDate: startOfMonth(centerDate),
        endDate: endOfMonth(centerDate),
      };
    case 'year':
      return {
        startDate: startOfYear(centerDate),
        endDate: endOfYear(centerDate),
      };
    default:
      return { startDate: centerDate, endDate: centerDate };
  }
}

function runSection1(): void {
  if (!shouldRunSection(1)) return;

  currentSection = 'SECTION 1: Date Range Calculation';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)

  // Test 1.1: Day view range
  runTest('Day view: single day range', () => {
    const { startDate, endDate } = calculateDateRange('day', today);
    const startDay = startOfDay(startDate);
    const endDay = startOfDay(endDate);
    
    return {
      passed: startDay.getTime() === endDay.getTime(),
      message: `Day view should have same start and end date`,
      expected: 'same date',
      actual: `${formatISO(startDay)} vs ${formatISO(endDay)}`,
    };
  });

  // Test 1.2: Week view range
  runTest('Week view: full week range (Sunday to Saturday)', () => {
    const { startDate, endDate } = calculateDateRange('week', today);
    const startDay = startOfDay(startDate);
    const endDay = startOfDay(endDate);
    const startDayOfWeek = startDay.getDay(); // Should be 0 (Sunday)
    const endDayOfWeek = endDay.getDay(); // Should be 6 (Saturday)
    
    return {
      passed: startDayOfWeek === 0 && endDayOfWeek === 6,
      message: `Week should start on Sunday (0) and end on Saturday (6)`,
      expected: { startDay: 0, endDay: 6 },
      actual: { startDay: startDayOfWeek, endDay: endDayOfWeek },
    };
  });

  // Test 1.3: Month view range
  runTest('Month view: first to last day of month', () => {
    const { startDate, endDate } = calculateDateRange('month', today);
    const startDay = startOfDay(startDate);
    const endDay = startOfDay(endDate);
    
    const isFirstDay = startDay.getDate() === 1;
    const isLastDay = endDay.getDate() >= 28; // Last day varies by month
    
    return {
      passed: isFirstDay && isLastDay && startDay.getMonth() === endDay.getMonth(),
      message: `Month should start on day 1 and end on last day of same month`,
      expected: 'first and last day of month',
      actual: { startDate: formatISO(startDay), endDate: formatISO(endDay) },
    };
  });

  // Test 1.4: Year view range
  runTest('Year view: first day to last day of year', () => {
    const { startDate, endDate } = calculateDateRange('year', today);
    const startDay = startOfDay(startDate);
    const endDay = startOfDay(endDate);
    
    const isJan1 = startDay.getMonth() === 0 && startDay.getDate() === 1;
    const isDec31 = endDay.getMonth() === 11 && endDay.getDate() === 31;
    const sameYear = startDay.getFullYear() === endDay.getFullYear();
    
    return {
      passed: isJan1 && isDec31 && sameYear,
      message: `Year should start on Jan 1 and end on Dec 31 of same year`,
      expected: 'Jan 1 to Dec 31',
      actual: { startDate: formatISO(startDay), endDate: formatISO(endDay) },
    };
  });
}

// ============================================================================
// SECTION 2: END-TO-END DATA FLOW (Day View)
// ============================================================================

function runSection2(): void {
  if (!shouldRunSection(2)) return;

  currentSection = 'SECTION 2: End-to-End Data Flow (Day View)';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = startOfDay(new Date(2025, 0, 15));
  const userId = 'test-user-1';

  // Test 2.1: Day view with single task
  runTest('Day view: single task appears correctly', () => {
    const task = createTestTask({
      user_id: userId,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });

    const { startDate, endDate } = calculateDateRange('day', today);
    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: false,
    };

    const calendarTasks = getTasksForDateRange([task], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    return {
      passed: dayGroups.length === 1 && dayGroups[0].tasks.length === 1,
      message: `Expected 1 day with 1 task, got ${dayGroups.length} days with ${dayGroups[0]?.tasks.length} tasks`,
      expected: { days: 1, tasks: 1 },
      actual: { days: dayGroups.length, tasks: dayGroups[0]?.tasks.length },
    };
  });

  // Test 2.2: Day view filters out other users' tasks
  runTest('Day view: filters out other users tasks', () => {
    const userTask = createTestTask({
      user_id: userId,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });
    const otherUserTask = createTestTask({
      user_id: 'other-user',
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });

    const { startDate, endDate } = calculateDateRange('day', today);
    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: false,
    };

    const calendarTasks = getTasksForDateRange([userTask, otherUserTask], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    return {
      passed: dayGroups[0].tasks.length === 1 && dayGroups[0].tasks[0].task.user_id === userId,
      message: `Expected 1 task for userId, got ${dayGroups[0]?.tasks.length}`,
      expected: 1,
      actual: dayGroups[0]?.tasks.length,
    };
  });
}

// ============================================================================
// SECTION 3: END-TO-END DATA FLOW (Week View)
// ============================================================================

function runSection3(): void {
  if (!shouldRunSection(3)) return;

  currentSection = 'SECTION 3: End-to-End Data Flow (Week View)';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = new Date(2025, 0, 15); // Wednesday, Jan 15, 2025
  const userId = 'test-user-1';

  // Test 3.1: Week view with tasks on multiple days
  runTest('Week view: tasks on multiple days appear correctly', () => {
    const { startDate, endDate } = calculateDateRange('week', today);
    
    const taskMonday = createTestTask({
      user_id: userId,
      visible_from: formatISO(addDays(startDate, 1), { representation: 'date' }), // Monday
      visible_until: formatISO(addDays(startDate, 1), { representation: 'date' }),
    });
    const taskFriday = createTestTask({
      user_id: userId,
      visible_from: formatISO(addDays(startDate, 5), { representation: 'date' }), // Friday
      visible_until: formatISO(addDays(startDate, 5), { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: false,
    };

    const calendarTasks = getTasksForDateRange([taskMonday, taskFriday], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    // Should have 7 days (Sunday to Saturday)
    const daysWithTasks = dayGroups.filter(day => day.tasks.length > 0);

    return {
      passed: dayGroups.length === 7 && daysWithTasks.length === 2,
      message: `Expected 7 days with 2 days having tasks, got ${dayGroups.length} days with ${daysWithTasks.length} days having tasks`,
      expected: { totalDays: 7, daysWithTasks: 2 },
      actual: { totalDays: dayGroups.length, daysWithTasks: daysWithTasks.length },
    };
  });
}

// ============================================================================
// SECTION 4: END-TO-END DATA FLOW (Month View)
// ============================================================================

function runSection4(): void {
  if (!shouldRunSection(4)) return;

  currentSection = 'SECTION 4: End-to-End Data Flow (Month View)';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = new Date(2025, 0, 15); // January 15, 2025
  const userId = 'test-user-1';

  // Test 4.1: Month view with tasks on different days
  runTest('Month view: tasks throughout month appear correctly', () => {
    const { startDate, endDate } = calculateDateRange('month', today);
    
    const taskStart = createTestTask({
      user_id: userId,
      visible_from: formatISO(startDate, { representation: 'date' }),
      visible_until: formatISO(startDate, { representation: 'date' }),
    });
    const taskMiddle = createTestTask({
      user_id: userId,
      visible_from: formatISO(addDays(startDate, 15), { representation: 'date' }),
      visible_until: formatISO(addDays(startDate, 15), { representation: 'date' }),
    });
    const taskEnd = createTestTask({
      user_id: userId,
      visible_from: formatISO(endDate, { representation: 'date' }),
      visible_until: formatISO(endDate, { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: false,
    };

    const calendarTasks = getTasksForDateRange([taskStart, taskMiddle, taskEnd], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    const daysWithTasks = dayGroups.filter(day => day.tasks.length > 0);

    // January 2025 has 31 days
    return {
      passed: dayGroups.length === 31 && daysWithTasks.length === 3,
      message: `Expected 31 days with 3 days having tasks, got ${dayGroups.length} days with ${daysWithTasks.length} days having tasks`,
      expected: { totalDays: 31, daysWithTasks: 3 },
      actual: { totalDays: dayGroups.length, daysWithTasks: daysWithTasks.length },
    };
  });

  // Test 4.2: Month view filters tasks outside range
  runTest('Month view: filters tasks outside month range', () => {
    const { startDate, endDate } = calculateDateRange('month', today);
    
    const taskInRange = createTestTask({
      user_id: userId,
      visible_from: formatISO(addDays(startDate, 10), { representation: 'date' }),
      visible_until: formatISO(addDays(startDate, 10), { representation: 'date' }),
    });
    const taskOutOfRange = createTestTask({
      user_id: userId,
      visible_from: formatISO(addMonths(endDate, 1), { representation: 'date' }), // Next month
      visible_until: formatISO(addMonths(endDate, 1), { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: false,
    };

    const calendarTasks = getTasksForDateRange([taskInRange, taskOutOfRange], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    const allTasks = dayGroups.flatMap(day => day.tasks);

    return {
      passed: allTasks.length === 1 && allTasks[0].task.id === taskInRange.id,
      message: `Expected 1 task in range, got ${allTasks.length}`,
      expected: 1,
      actual: allTasks.length,
    };
  });
}

// ============================================================================
// SECTION 5: INCLUDE COMPLETED FLAG
// ============================================================================

function runSection5(): void {
  if (!shouldRunSection(5)) return;

  currentSection = 'SECTION 5: Include Completed Flag';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = startOfDay(new Date());
  const userId = 'test-user-1';

  // Test 5.1: Excludes completed by default
  runTest('Excludes completed tasks by default', () => {
    const pending = createTestTask({
      user_id: userId,
      status: 'pending',
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });
    const completed = createTestTask({
      user_id: userId,
      status: 'done',
      is_completed: true,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });

    const { startDate, endDate } = calculateDateRange('day', today);
    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: false, // Default
    };

    const calendarTasks = getTasksForDateRange([pending, completed], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    return {
      passed: dayGroups[0].tasks.length === 1 && dayGroups[0].tasks[0].task.id === pending.id,
      message: `Expected 1 pending task, got ${dayGroups[0]?.tasks.length}`,
      expected: 1,
      actual: dayGroups[0]?.tasks.length,
    };
  });

  // Test 5.2: Includes completed when flag is true
  runTest('Includes completed tasks when includeCompleted=true', () => {
    const pending = createTestTask({
      user_id: userId,
      status: 'pending',
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });
    const completed = createTestTask({
      user_id: userId,
      status: 'done',
      is_completed: true,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(today, { representation: 'date' }),
    });

    const { startDate, endDate } = calculateDateRange('day', today);
    const query: CalendarTaskQuery = {
      startDate,
      endDate,
      userId,
      includeCompleted: true,
    };

    const calendarTasks = getTasksForDateRange([pending, completed], query);
    const dayGroups = groupTasksByDay(calendarTasks, startDate, endDate);

    return {
      passed: dayGroups[0].tasks.length === 2,
      message: `Expected 2 tasks (pending + completed), got ${dayGroups[0]?.tasks.length}`,
      expected: 2,
      actual: dayGroups[0]?.tasks.length,
    };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

function runAllTests(): void {
  console.log('\n🧪 CALENDAR HOOK INTEGRATION TESTS');
  console.log('='.repeat(60));
  console.log(`Running all sections${sectionsToRun ? ` (filtered: ${sectionsToRun.join(', ')})` : ''}...\n`);

  runSection1();
  runSection2();
  runSection3();
  runSection4();
  runSection5();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n🚨 FAILED TESTS:');
    console.log('='.repeat(60));
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`\n❌ Test ${r.testNumber}: ${r.name} (${r.section})`);
        console.log(`   ${r.message}`);
        if (r.expected !== undefined && r.actual !== undefined) {
          console.log(`   Expected: ${JSON.stringify(r.expected)}`);
          console.log(`   Actual: ${JSON.stringify(r.actual)}`);
        }
      });
  }

  console.log('\n' + '='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();

