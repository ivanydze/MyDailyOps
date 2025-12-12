/**
 * UPCOMING FILTERING TESTS
 * 
 * Tests for Problem 4: Future Tasks Must Be Visible in Advance (UPCOMING panel)
 * 
 * Tests verify:
 * 1. isUpcoming() function correctly identifies tasks within next 7 days
 * 2. UPCOMING view filters tasks correctly using isUpcoming()
 * 3. Edge cases and boundary conditions
 * 4. Integration with task filtering logic
 * 5. Tasks are correctly grouped by day in UPCOMING view
 * 
 * Usage:
 *   tsx test-upcoming-filtering.ts
 */

import { isUpcoming } from './src/utils/visibility';
import { calculateVisibility } from './src/utils/visibility';
import { formatISO, addDays, subDays, startOfDay, parseISO } from 'date-fns';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

interface TestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

const results: TestResult[] = [];
let testCounter = 0;

// Helper functions
function test(name: string, fn: () => void) {
  testCounter++;
  try {
    fn();
    const result: TestResult = {
      testNumber: testCounter,
      name,
      passed: true,
      message: '✅ PASSED',
    };
    results.push(result);
    console.log(`✅ Test ${testCounter}: ${name}`);
  } catch (error: any) {
    const result: TestResult = {
      testNumber: testCounter,
      name,
      passed: false,
      message: `❌ FAILED: ${error.message}`,
      expected: error.expected,
      actual: error.actual,
    };
    results.push(result);
    console.log(`❌ Test ${testCounter}: ${name} - ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    const error: any = new Error(message);
    throw error;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    const error: any = new Error(message || `Expected ${expected}, got ${actual}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

// ============================================================================
// SECTION 1: BASIC UPCOMING FILTERING
// ============================================================================

test('1.1: Task visible tomorrow is upcoming', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
  
  const result = isUpcoming(tomorrowISO, today, 7);
  assertEqual(result, true, 'Task visible tomorrow should be upcoming');
});

test('1.2: Task visible in 7 days is upcoming (boundary)', () => {
  const today = new Date();
  const in7Days = addDays(today, 7);
  const in7DaysISO = formatISO(startOfDay(in7Days), { representation: 'date' });
  
  const result = isUpcoming(in7DaysISO, today, 7);
  assertEqual(result, true, 'Task visible exactly in 7 days should be upcoming');
});

test('1.3: Task visible in 8 days is NOT upcoming', () => {
  const today = new Date();
  const in8Days = addDays(today, 8);
  const in8DaysISO = formatISO(startOfDay(in8Days), { representation: 'date' });
  
  const result = isUpcoming(in8DaysISO, today, 7);
  assertEqual(result, false, 'Task visible in 8 days should NOT be upcoming');
});

test('1.4: Task visible today is NOT upcoming', () => {
  const today = new Date();
  const todayISO = formatISO(startOfDay(today), { representation: 'date' });
  
  const result = isUpcoming(todayISO, today, 7);
  assertEqual(result, false, 'Task visible today should NOT be upcoming (should be in Today view)');
});

test('1.5: Task visible in past is NOT upcoming', () => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const yesterdayISO = formatISO(startOfDay(yesterday), { representation: 'date' });
  
  const result = isUpcoming(yesterdayISO, today, 7);
  assertEqual(result, false, 'Task visible in past should NOT be upcoming');
});

// ============================================================================
// SECTION 2: UPCOMING WITH DIFFERENT DAY RANGES
// ============================================================================

test('2.1: Custom daysAhead parameter works correctly', () => {
  const today = new Date();
  const in5Days = addDays(today, 5);
  const in5DaysISO = formatISO(startOfDay(in5Days), { representation: 'date' });
  
  // With 3 days ahead, should NOT be upcoming
  const result3Days = isUpcoming(in5DaysISO, today, 3);
  assertEqual(result3Days, false, 'Task visible in 5 days should NOT be upcoming with 3-day window');
  
  // With 7 days ahead, should be upcoming
  const result7Days = isUpcoming(in5DaysISO, today, 7);
  assertEqual(result7Days, true, 'Task visible in 5 days should be upcoming with 7-day window');
});

test('2.2: Task at exact boundary of custom window is upcoming', () => {
  const today = new Date();
  const in10Days = addDays(today, 10);
  const in10DaysISO = formatISO(startOfDay(in10Days), { representation: 'date' });
  
  const result = isUpcoming(in10DaysISO, today, 10);
  assertEqual(result, true, 'Task visible exactly at 10-day boundary should be upcoming');
});

test('2.3: Task one day after boundary is NOT upcoming', () => {
  const today = new Date();
  const in11Days = addDays(today, 11);
  const in11DaysISO = formatISO(startOfDay(in11Days), { representation: 'date' });
  
  const result = isUpcoming(in11DaysISO, today, 10);
  assertEqual(result, false, 'Task visible one day after 10-day boundary should NOT be upcoming');
});

// ============================================================================
// SECTION 3: UPCOMING WITH TASKS WITH DEADLINES
// ============================================================================

test('3.1: Task with deadline in future, duration 1 - visible_from determines upcoming', () => {
  const today = new Date();
  const deadline = addDays(today, 5);
  const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
  
  const visibility = calculateVisibility(deadlineISO, 1);
  // visible_from = deadline - 0 = deadline (5 days from now)
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, true, 'Task with deadline in 5 days should be upcoming');
});

test('3.2: Task with deadline in future, long duration - visible_from determines upcoming', () => {
  const today = new Date();
  const deadline = addDays(today, 10);
  const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
  
  const visibility = calculateVisibility(deadlineISO, 5);
  // visible_from = deadline - 4 = today + 6
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, true, 'Task with deadline in 10 days, duration 5, visible_from in 6 days should be upcoming');
});

test('3.3: Task with deadline too far in future - NOT upcoming', () => {
  const today = new Date();
  const deadline = addDays(today, 20);
  const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
  
  const visibility = calculateVisibility(deadlineISO, 3);
  // visible_from = deadline - 2 = today + 18
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, false, 'Task with visible_from in 18 days should NOT be upcoming');
});

test('3.4: Task with deadline tomorrow, duration extends back to today - NOT upcoming', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
  
  const visibility = calculateVisibility(tomorrowISO, 2);
  // visible_from = tomorrow - 1 = today
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, false, 'Task visible today should NOT be upcoming (should be in Today view)');
});

// ============================================================================
// SECTION 4: UPCOMING WITH TASKS WITHOUT DEADLINES
// ============================================================================

test('4.1: Task without deadline, start_date in future - is upcoming', () => {
  const today = new Date();
  const startDate = addDays(today, 4);
  const startDateISO = formatISO(startOfDay(startDate), { representation: 'date' });
  
  const visibility = calculateVisibility(null, 3, startDateISO);
  // visible_from = startDate (4 days from now)
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, true, 'Task without deadline, start_date in 4 days should be upcoming');
});

test('4.2: Task without deadline, start_date today - NOT upcoming', () => {
  const today = new Date();
  const todayISO = formatISO(startOfDay(today), { representation: 'date' });
  
  const visibility = calculateVisibility(null, 5, todayISO);
  // visible_from = today
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, false, 'Task without deadline, start_date today should NOT be upcoming');
});

test('4.3: Task without deadline, start_date in past - NOT upcoming', () => {
  const today = new Date();
  const pastDate = subDays(today, 3);
  const pastDateISO = formatISO(startOfDay(pastDate), { representation: 'date' });
  
  const visibility = calculateVisibility(null, 5, pastDateISO);
  // visible_from = pastDate (3 days ago)
  
  const result = isUpcoming(visibility.visible_from, today, 7);
  assertEqual(result, false, 'Task without deadline, start_date in past should NOT be upcoming');
});

// ============================================================================
// SECTION 5: NULL AND EDGE CASES
// ============================================================================

test('5.1: Task with null visible_from is NOT upcoming', () => {
  const today = new Date();
  const result = isUpcoming(null, today, 7);
  assertEqual(result, false, 'Task with null visible_from should NOT be upcoming');
});

test('5.2: Task with undefined visible_from is NOT upcoming', () => {
  const today = new Date();
  const result = isUpcoming(undefined, today, 7);
  assertEqual(result, false, 'Task with undefined visible_from should NOT be upcoming');
});

test('5.3: Task with invalid date string returns false', () => {
  const today = new Date();
  const result = isUpcoming('invalid-date', today, 7);
  assertEqual(result, false, 'Task with invalid date string should return false (not crash)');
});

test('5.4: Task visible exactly one day ahead is upcoming', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
  
  const result = isUpcoming(tomorrowISO, today, 7);
  assertEqual(result, true, 'Task visible exactly one day ahead should be upcoming');
});

test('5.5: Task visible exactly 7 days ahead is upcoming (inclusive boundary)', () => {
  const today = new Date();
  const in7Days = addDays(today, 7);
  const in7DaysISO = formatISO(startOfDay(in7Days), { representation: 'date' });
  
  const result = isUpcoming(in7DaysISO, today, 7);
  assertEqual(result, true, 'Task visible exactly at 7-day boundary should be upcoming (inclusive)');
});

// ============================================================================
// SECTION 6: INTEGRATION WITH TASK FILTERING
// ============================================================================

test('6.1: Multiple tasks filtered correctly for upcoming', () => {
  const today = new Date();
  const tasks = [
    { visible_from: formatISO(startOfDay(addDays(today, 1)), { representation: 'date' }) }, // Tomorrow - upcoming
    { visible_from: formatISO(startOfDay(addDays(today, 3)), { representation: 'date' }) }, // 3 days - upcoming
    { visible_from: formatISO(startOfDay(addDays(today, 8)), { representation: 'date' }) }, // 8 days - NOT upcoming
    { visible_from: formatISO(startOfDay(today), { representation: 'date' }) }, // Today - NOT upcoming
    { visible_from: formatISO(startOfDay(subDays(today, 2)), { representation: 'date' }) }, // Past - NOT upcoming
    { visible_from: formatISO(startOfDay(addDays(today, 7)), { representation: 'date' }) }, // 7 days - upcoming
  ];
  
  const upcomingTasks = tasks.filter(task => isUpcoming(task.visible_from, today, 7));
  
  assertEqual(upcomingTasks.length, 3, 'Should have 3 upcoming tasks');
  assert(upcomingTasks.some(t => t.visible_from === tasks[0].visible_from), 'Task 1 should be upcoming');
  assert(upcomingTasks.some(t => t.visible_from === tasks[1].visible_from), 'Task 2 should be upcoming');
  assert(upcomingTasks.some(t => t.visible_from === tasks[5].visible_from), 'Task 6 should be upcoming');
});

test('6.2: Upcoming tasks can be sorted by visible_from', () => {
  const today = new Date();
  const tasks = [
    { id: '1', visible_from: formatISO(startOfDay(addDays(today, 5)), { representation: 'date' }) },
    { id: '2', visible_from: formatISO(startOfDay(addDays(today, 2)), { representation: 'date' }) },
    { id: '3', visible_from: formatISO(startOfDay(addDays(today, 7)), { representation: 'date' }) },
    { id: '4', visible_from: formatISO(startOfDay(addDays(today, 3)), { representation: 'date' }) },
  ];
  
  const upcomingTasks = tasks.filter(task => isUpcoming(task.visible_from, today, 7));
  upcomingTasks.sort((a, b) => {
    if (!a.visible_from || !b.visible_from) return 0;
    return parseISO(a.visible_from).getTime() - parseISO(b.visible_from).getTime();
  });
  
  assertEqual(upcomingTasks.length, 4, 'All tasks should be upcoming');
  assertEqual(upcomingTasks[0].id, '2', 'First task should be visible in 2 days');
  assertEqual(upcomingTasks[1].id, '4', 'Second task should be visible in 3 days');
  assertEqual(upcomingTasks[2].id, '1', 'Third task should be visible in 5 days');
  assertEqual(upcomingTasks[3].id, '3', 'Fourth task should be visible in 7 days');
});

test('6.3: Empty array of tasks returns empty upcoming', () => {
  const today = new Date();
  const tasks: Array<{ visible_from: string | null }> = [];
  
  const upcomingTasks = tasks.filter(task => isUpcoming(task.visible_from, today, 7));
  
  assertEqual(upcomingTasks.length, 0, 'Empty task list should return empty upcoming list');
});

test('6.4: Tasks can be grouped by day for UPCOMING view', () => {
  const today = new Date();
  const tasks = [
    { id: '1', visible_from: formatISO(startOfDay(addDays(today, 2)), { representation: 'date' }) },
    { id: '2', visible_from: formatISO(startOfDay(addDays(today, 2)), { representation: 'date' }) }, // Same day
    { id: '3', visible_from: formatISO(startOfDay(addDays(today, 5)), { representation: 'date' }) },
    { id: '4', visible_from: formatISO(startOfDay(addDays(today, 2)), { representation: 'date' }) }, // Same day
    { id: '5', visible_from: formatISO(startOfDay(addDays(today, 7)), { representation: 'date' }) },
  ];
  
  const upcomingTasks = tasks.filter(task => isUpcoming(task.visible_from, today, 7));
  
  // Group by visible_from
  const grouped = upcomingTasks.reduce((acc, task) => {
    const day = task.visible_from || '';
    if (!acc[day]) acc[day] = [];
    acc[day].push(task);
    return acc;
  }, {} as Record<string, typeof upcomingTasks>);
  
  assertEqual(Object.keys(grouped).length, 3, 'Should have 3 different days');
  assertEqual(grouped[tasks[0].visible_from!].length, 3, 'Day 2 should have 3 tasks');
  assertEqual(grouped[tasks[2].visible_from!].length, 1, 'Day 5 should have 1 task');
  assertEqual(grouped[tasks[4].visible_from!].length, 1, 'Day 7 should have 1 task');
});

// ============================================================================
// SECTION 7: BOUNDARY CONDITIONS
// ============================================================================

test('7.1: Task visible_from exactly at today + 1 minute is NOT upcoming (must be after today)', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  // visible_from must be compared at day level, not minute level
  const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
  
  // Even if we pass a date that's today + 1 minute, when parsed it becomes start of day
  const result = isUpcoming(tomorrowISO, today, 7);
  assertEqual(result, true, 'Task visible_from at start of tomorrow should be upcoming');
});

test('7.2: Task visible_from exactly equal to today is NOT upcoming', () => {
  const today = new Date();
  const todayISO = formatISO(startOfDay(today), { representation: 'date' });
  
  const result = isUpcoming(todayISO, today, 7);
  assertEqual(result, false, 'Task visible_from exactly equal to today should NOT be upcoming');
});

test('7.3: Days ahead parameter of 0 returns false for future tasks', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
  
  const result = isUpcoming(tomorrowISO, today, 0);
  assertEqual(result, false, 'Task visible tomorrow should NOT be upcoming with 0-day window');
});

test('7.4: Days ahead parameter of 1 returns true only for tasks 1 day ahead', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const in2Days = addDays(today, 2);
  
  const resultTomorrow = isUpcoming(
    formatISO(startOfDay(tomorrow), { representation: 'date' }),
    today,
    1
  );
  const result2Days = isUpcoming(
    formatISO(startOfDay(in2Days), { representation: 'date' }),
    today,
    1
  );
  
  assertEqual(resultTomorrow, true, 'Task visible tomorrow should be upcoming with 1-day window');
  assertEqual(result2Days, false, 'Task visible in 2 days should NOT be upcoming with 1-day window');
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\nTotal tests: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('FAILED TESTS');
  console.log('='.repeat(80));
  results
    .filter(r => !r.passed)
    .forEach(r => {
      console.log(`\n❌ Test ${r.testNumber}: ${r.name}`);
      console.log(`   ${r.message}`);
      if (r.expected !== undefined) {
        console.log(`   Expected: ${JSON.stringify(r.expected)}`);
      }
      if (r.actual !== undefined) {
        console.log(`   Actual: ${JSON.stringify(r.actual)}`);
      }
    });
}

console.log('\n' + '='.repeat(80));
console.log(failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
console.log('='.repeat(80) + '\n');

// Exit with error code if tests failed
process.exit(failed > 0 ? 1 : 0);

