/**
 * CALENDAR UTILITIES COMPREHENSIVE TESTS
 * 
 * Full test suite for Phase 1: Core Calendar Utilities
 * 
 * Tests cover:
 * - doesTaskIntersectDateRange()
 * - getTasksForDateRange()
 * - groupTasksByDay()
 * - getDayContextForTask()
 * 
 * Usage:
 *   tsx test-calendar-utilities.ts                    # Run all tests
 *   tsx test-calendar-utilities.ts --section=1        # Run section 1 only
 *   tsx test-calendar-utilities.ts --section=1,2,3    # Run sections 1, 2, 3
 */

import {
  doesTaskIntersectDateRange,
  getTasksForDateRange,
  groupTasksByDay,
  getDayContextForTask,
  type CalendarTask,
  type CalendarTaskQuery,
} from './src/utils/calendar';
import { formatISO, parseISO, addDays, subDays, startOfDay } from 'date-fns';
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
  : null; // null = run all

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
// SECTION 1: doesTaskIntersectDateRange() TESTS
// ============================================================================

function runSection1(): void {
  if (!shouldRunSection(1)) return;

  currentSection = 'SECTION 1: doesTaskIntersectDateRange()';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const nextWeek = addDays(today, 7);

  // Test 1.1: Task with full visibility range, intersects
  runTest('Task with full range, intersects at start', () => {
    const taskFrom = formatISO(today, { representation: 'date' });
    const taskUntil = formatISO(dayAfterTomorrow, { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly intersects range' : 'Task should intersect range',
      expected: true,
      actual: result,
    };
  });

  // Test 1.2: Task with full visibility range, intersects in middle
  runTest('Task with full range, intersects in middle', () => {
    const taskFrom = formatISO(subDays(today, 2), { representation: 'date' });
    const taskUntil = formatISO(nextWeek, { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly intersects range' : 'Task should intersect range',
      expected: true,
      actual: result,
    };
  });

  // Test 1.3: Task with full visibility range, no intersection (before)
  runTest('Task with full range, no intersection (before range)', () => {
    const taskFrom = formatISO(subDays(today, 5), { representation: 'date' });
    const taskUntil = formatISO(subDays(today, 2), { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === false,
      message: result ? 'Task should not intersect range' : 'Task correctly does not intersect',
      expected: false,
      actual: result,
    };
  });

  // Test 1.4: Task with full visibility range, no intersection (after)
  runTest('Task with full range, no intersection (after range)', () => {
    const taskFrom = formatISO(addDays(today, 3), { representation: 'date' });
    const taskUntil = formatISO(nextWeek, { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === false,
      message: result ? 'Task should not intersect range' : 'Task correctly does not intersect',
      expected: false,
      actual: result,
    };
  });

  // Test 1.5: Task with only visible_from (legacy/open-ended)
  runTest('Task with only visible_from, intersects', () => {
    const taskFrom = formatISO(subDays(today, 2), { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, null, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly intersects range' : 'Task should intersect range',
      expected: true,
      actual: result,
    };
  });

  // Test 1.6: Task with only visible_until (closed-ended)
  runTest('Task with only visible_until, intersects', () => {
    const taskUntil = formatISO(dayAfterTomorrow, { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(null, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly intersects range' : 'Task should intersect range',
      expected: true,
      actual: result,
    };
  });

  // Test 1.7: Task with no visibility range (legacy behavior)
  runTest('Task with no visibility range (always visible)', () => {
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(null, null, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly always visible' : 'Task should be always visible',
      expected: true,
      actual: result,
    };
  });

  // Test 1.8: Task touches range at boundary (start)
  runTest('Task touches range at boundary (start)', () => {
    const taskFrom = formatISO(today, { representation: 'date' });
    const taskUntil = formatISO(today, { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly intersects at boundary' : 'Task should intersect at boundary',
      expected: true,
      actual: result,
    };
  });

  // Test 1.9: Task touches range at boundary (end)
  runTest('Task touches range at boundary (end)', () => {
    const taskFrom = formatISO(dayAfterTomorrow, { representation: 'date' });
    const taskUntil = formatISO(dayAfterTomorrow, { representation: 'date' });
    const rangeStart = today;
    const rangeEnd = dayAfterTomorrow;

    const result = doesTaskIntersectDateRange(taskFrom, taskUntil, rangeStart, rangeEnd);
    return {
      passed: result === true,
      message: result ? 'Task correctly intersects at boundary' : 'Task should intersect at boundary',
      expected: true,
      actual: result,
    };
  });
}

// ============================================================================
// SECTION 2: getTasksForDateRange() TESTS
// ============================================================================

function runSection2(): void {
  if (!shouldRunSection(2)) return;

  currentSection = 'SECTION 2: getTasksForDateRange()';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const userId = 'test-user-1';

  // Test 2.1: Filter by userId
  runTest('Filters tasks by userId', () => {
    const task1 = createTestTask({
      user_id: userId,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });
    const task2 = createTestTask({
      user_id: 'other-user',
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: tomorrow,
      userId,
      includeCompleted: false,
    };

    const result = getTasksForDateRange([task1, task2], query);
    return {
      passed: result.length === 1 && result[0].task.user_id === userId,
      message: `Expected 1 task, got ${result.length}`,
      expected: 1,
      actual: result.length,
    };
  });

  // Test 2.2: Filter out recurring templates
  runTest('Filters out recurring templates', () => {
    const template = createTestTask({
      user_id: userId,
      recurring_options: { type: 'daily' },
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });
    const instance = createTestTask({
      user_id: userId,
      recurring_options: null,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: tomorrow,
      userId,
      includeCompleted: false,
    };

    const result = getTasksForDateRange([template, instance], query);
    return {
      passed: result.length === 1 && result[0].task.id === instance.id,
      message: `Expected 1 instance, got ${result.length}. Template should be filtered out.`,
      expected: 1,
      actual: result.length,
    };
  });

  // Test 2.3: Filter out completed tasks (default)
  runTest('Filters out completed tasks by default', () => {
    const pending = createTestTask({
      user_id: userId,
      status: 'pending',
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });
    const completed = createTestTask({
      user_id: userId,
      status: 'done',
      is_completed: true,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: tomorrow,
      userId,
      includeCompleted: false,
    };

    const result = getTasksForDateRange([pending, completed], query);
    return {
      passed: result.length === 1 && result[0].task.id === pending.id,
      message: `Expected 1 pending task, got ${result.length}`,
      expected: 1,
      actual: result.length,
    };
  });

  // Test 2.4: Include completed tasks when flag is true
  runTest('Includes completed tasks when includeCompleted=true', () => {
    const pending = createTestTask({
      user_id: userId,
      status: 'pending',
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });
    const completed = createTestTask({
      user_id: userId,
      status: 'done',
      is_completed: true,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: tomorrow,
      userId,
      includeCompleted: true,
    };

    const result = getTasksForDateRange([pending, completed], query);
    return {
      passed: result.length === 2,
      message: `Expected 2 tasks, got ${result.length}`,
      expected: 2,
      actual: result.length,
    };
  });

  // Test 2.5: Filter by date range intersection
  runTest('Filters tasks by date range intersection', () => {
    const taskInRange = createTestTask({
      user_id: userId,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(tomorrow, { representation: 'date' }),
    });
    const taskOutOfRange = createTestTask({
      user_id: userId,
      visible_from: formatISO(addDays(today, 10), { representation: 'date' }),
      visible_until: formatISO(addDays(today, 12), { representation: 'date' }),
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: tomorrow,
      userId,
      includeCompleted: false,
    };

    const result = getTasksForDateRange([taskInRange, taskOutOfRange], query);
    return {
      passed: result.length === 1 && result[0].task.id === taskInRange.id,
      message: `Expected 1 task in range, got ${result.length}`,
      expected: 1,
      actual: result.length,
    };
  });

  // Test 2.6: Calculate spanDays correctly
  runTest('Calculates spanDays correctly for multi-day task', () => {
    const task = createTestTask({
      user_id: userId,
      visible_from: formatISO(today, { representation: 'date' }),
      visible_until: formatISO(addDays(today, 4), { representation: 'date' }), // 5 days total
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: addDays(today, 10),
      userId,
      includeCompleted: false,
    };

    const result = getTasksForDateRange([task], query);
    return {
      passed: result.length === 1 && result[0].spanDays === 5,
      message: `Expected spanDays=5, got ${result[0]?.spanDays}`,
      expected: 5,
      actual: result[0]?.spanDays,
    };
  });

  // Test 2.7: Handle tasks without visibility range (legacy)
  runTest('Handles tasks without visibility range (legacy)', () => {
    const legacyTask = createTestTask({
      user_id: userId,
      visible_from: null,
      visible_until: null,
    });

    const query: CalendarTaskQuery = {
      startDate: today,
      endDate: tomorrow,
      userId,
      includeCompleted: false,
    };

    const result = getTasksForDateRange([legacyTask], query);
    return {
      passed: result.length === 1,
      message: `Expected 1 legacy task, got ${result.length}`,
      expected: 1,
      actual: result.length,
    };
  });
}

// ============================================================================
// SECTION 3: groupTasksByDay() TESTS
// ============================================================================

function runSection3(): void {
  if (!shouldRunSection(3)) return;

  currentSection = 'SECTION 3: groupTasksByDay()';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  // Test 3.1: Single-day task appears in correct day
  runTest('Single-day task appears in correct day', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(today, { representation: 'date' }),
      spanDays: 1,
    };

    const result = groupTasksByDay([calendarTask], today, today);
    return {
      passed: result.length === 1 && result[0].tasks.length === 1,
      message: `Expected 1 day with 1 task, got ${result.length} days with ${result[0]?.tasks.length} tasks`,
      expected: { days: 1, tasksPerDay: 1 },
      actual: { days: result.length, tasksPerDay: result[0]?.tasks.length },
    };
  });

  // Test 3.2: Multi-day task appears in all relevant days
  runTest('Multi-day task appears in all relevant days', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(dayAfterTomorrow, { representation: 'date' }), // 3 days
      spanDays: 3,
    };

    const result = groupTasksByDay([calendarTask], today, dayAfterTomorrow);
    return {
      passed: result.length === 3 && result.every(day => day.tasks.length === 1),
      message: `Expected 3 days with 1 task each, got ${result.length} days`,
      expected: { days: 3, allHaveTasks: true },
      actual: { days: result.length, allHaveTasks: result.every(day => day.tasks.length === 1) },
    };
  });

  // Test 3.3: Multiple tasks on same day
  runTest('Multiple tasks on same day', () => {
    const task1: CalendarTask = {
      task: createTestTask({ id: 'task-1' }),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(today, { representation: 'date' }),
      spanDays: 1,
    };
    const task2: CalendarTask = {
      task: createTestTask({ id: 'task-2' }),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(today, { representation: 'date' }),
      spanDays: 1,
    };

    const result = groupTasksByDay([task1, task2], today, today);
    return {
      passed: result.length === 1 && result[0].tasks.length === 2,
      message: `Expected 1 day with 2 tasks, got ${result.length} days with ${result[0]?.tasks.length} tasks`,
      expected: { days: 1, tasks: 2 },
      actual: { days: result.length, tasks: result[0]?.tasks.length },
    };
  });

  // Test 3.4: Empty task list
  runTest('Handles empty task list', () => {
    const result = groupTasksByDay([], today, tomorrow);
    return {
      passed: result.length === 2 && result.every(day => day.tasks.length === 0),
      message: `Expected 2 days with 0 tasks each, got ${result.length} days`,
      expected: { days: 2, allEmpty: true },
      actual: { days: result.length, allEmpty: result.every(day => day.tasks.length === 0) },
    };
  });

  // Test 3.5: Task spanning month boundary
  runTest('Handles task spanning month boundary', () => {
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDayOfNextMonth = addDays(lastDayOfMonth, 1);

    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(lastDayOfMonth, { representation: 'date' }),
      visibleUntil: formatISO(firstDayOfNextMonth, { representation: 'date' }),
      spanDays: 2,
    };

    const result = groupTasksByDay([calendarTask], lastDayOfMonth, firstDayOfNextMonth);
    return {
      passed: result.length === 2 && result.every(day => day.tasks.length === 1),
      message: `Expected 2 days with 1 task each, got ${result.length} days`,
      expected: { days: 2, allHaveTasks: true },
      actual: { days: result.length, allHaveTasks: result.every(day => day.tasks.length === 1) },
    };
  });

  // Test 3.6: Correct dateKey format (YYYY-MM-DD)
  runTest('DateKey is in correct format (YYYY-MM-DD)', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(today, { representation: 'date' }),
      spanDays: 1,
    };

    const result = groupTasksByDay([calendarTask], today, today);
    const dateKey = result[0]?.dateKey;
    const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;

    return {
      passed: dateKeyRegex.test(dateKey || ''),
      message: `Expected dateKey in YYYY-MM-DD format, got ${dateKey}`,
      expected: 'YYYY-MM-DD format',
      actual: dateKey,
    };
  });
}

// ============================================================================
// SECTION 4: getDayContextForTask() TESTS
// ============================================================================

function runSection4(): void {
  if (!shouldRunSection(4)) return;

  currentSection = 'SECTION 4: getDayContextForTask()';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);
  const nextWeek = addDays(today, 7);

  // Test 4.1: First day of multi-day task
  runTest('Returns correct context for first day', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(addDays(today, 4), { representation: 'date' }), // 5 days
      spanDays: 5,
    };

    const context = getDayContextForTask(calendarTask, today);
    return {
      passed: context !== null &&
        context.dayIndex === 1 &&
        context.totalDays === 5 &&
        context.isFirstDay === true &&
        context.isLastDay === false &&
        context.isMiddleDay === false,
      message: context ? 'Context should show first day' : 'Context should not be null',
      expected: { dayIndex: 1, totalDays: 5, isFirstDay: true },
      actual: context,
    };
  });

  // Test 4.2: Last day of multi-day task
  runTest('Returns correct context for last day', () => {
    const lastDay = addDays(today, 4);
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(lastDay, { representation: 'date' }), // 5 days
      spanDays: 5,
    };

    const context = getDayContextForTask(calendarTask, lastDay);
    return {
      passed: context !== null &&
        context.dayIndex === 5 &&
        context.totalDays === 5 &&
        context.isFirstDay === false &&
        context.isLastDay === true &&
        context.isMiddleDay === false,
      message: context ? 'Context should show last day' : 'Context should not be null',
      expected: { dayIndex: 5, totalDays: 5, isLastDay: true },
      actual: context,
    };
  });

  // Test 4.3: Middle day of multi-day task
  runTest('Returns correct context for middle day', () => {
    const middleDay = addDays(today, 2);
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(addDays(today, 4), { representation: 'date' }), // 5 days
      spanDays: 5,
    };

    const context = getDayContextForTask(calendarTask, middleDay);
    return {
      passed: context !== null &&
        context.dayIndex === 3 &&
        context.totalDays === 5 &&
        context.isFirstDay === false &&
        context.isLastDay === false &&
        context.isMiddleDay === true,
      message: context ? 'Context should show middle day' : 'Context should not be null',
      expected: { dayIndex: 3, totalDays: 5, isMiddleDay: true },
      actual: context,
    };
  });

  // Test 4.4: Single-day task
  runTest('Returns correct context for single-day task', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(today, { representation: 'date' }),
      spanDays: 1,
    };

    const context = getDayContextForTask(calendarTask, today);
    return {
      passed: context !== null &&
        context.dayIndex === 1 &&
        context.totalDays === 1 &&
        context.isFirstDay === true &&
        context.isLastDay === true &&
        context.isMiddleDay === false,
      message: context ? 'Context should show single day (first and last)' : 'Context should not be null',
      expected: { dayIndex: 1, totalDays: 1, isFirstDay: true, isLastDay: true },
      actual: context,
    };
  });

  // Test 4.5: Task without visibility range returns null
  runTest('Returns null for task without visibility range', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: null,
      visibleUntil: null,
      spanDays: 1,
    };

    const context = getDayContextForTask(calendarTask, today);
    return {
      passed: context === null,
      message: 'Context should be null for task without visibility range',
      expected: null,
      actual: context,
    };
  });

  // Test 4.6: Date outside task range returns null
  runTest('Returns null for date outside task range', () => {
    const calendarTask: CalendarTask = {
      task: createTestTask(),
      visibleFrom: formatISO(today, { representation: 'date' }),
      visibleUntil: formatISO(tomorrow, { representation: 'date' }),
      spanDays: 2,
    };

    const context = getDayContextForTask(calendarTask, nextWeek);
    return {
      passed: context === null,
      message: 'Context should be null for date outside task range',
      expected: null,
      actual: context,
    };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

function runAllTests(): void {
  console.log('\n🧪 CALENDAR UTILITIES COMPREHENSIVE TESTS');
  console.log('='.repeat(60));
  console.log(`Running all sections${sectionsToRun ? ` (filtered: ${sectionsToRun.join(', ')})` : ''}...\n`);

  runSection1();
  runSection2();
  runSection3();
  runSection4();

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

