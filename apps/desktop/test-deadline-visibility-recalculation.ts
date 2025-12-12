/**
 * DEADLINE VISIBILITY RECALCULATION TESTS
 * 
 * Tests for Problem 11: Changing Deadline Breaks Duration Logic
 * 
 * Tests verify:
 * 1. Visibility is recalculated when deadline changes
 * 2. Visibility follows Problem 5 formula (deadline-anchored)
 * 3. Recalculation works for tasks with and without duration
 * 4. Edge cases: null deadline, changing duration with deadline, etc.
 * 5. Recurring tasks handle deadline changes correctly
 * 
 * Usage:
 *   tsx test-deadline-visibility-recalculation.ts
 */

import { calculateVisibility } from './src/utils/visibility';
import { parseISO, formatISO, addDays, subDays, startOfDay } from 'date-fns';

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
  
  // Skip if section filtering is enabled
  if (sectionsToRun && !sectionsToRun.includes(currentSection)) {
    return;
  }

  try {
    fn();
    const result: TestResult = {
      section: currentSection,
      testNumber: testCounter,
      name,
      passed: true,
      message: '✅ PASSED',
    };
    results.push(result);
    console.log(`✅ Test ${testCounter}: ${name}`);
  } catch (error: any) {
    const result: TestResult = {
      section: currentSection,
      testNumber: testCounter,
      name,
      passed: false,
      message: error.message || 'Test failed',
      expected: error.expected,
      actual: error.actual,
    };
    results.push(result);
    console.log(`❌ Test ${testCounter}: ${name}`);
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
// SECTION 1: Basic Deadline Change Tests
// ============================================================================

section('1. Basic Deadline Change Visibility Recalculation');

test('1.1: Changing deadline updates visible_from and visible_until', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const newDeadline = formatISO(startOfDay(new Date('2024-01-20')));
  const durationDays = 3;

  // Initial visibility
  const initialVisibility = calculateVisibility(initialDeadline, durationDays);
  // visible_from should be: 2024-01-15 - (3-1) = 2024-01-13
  // visible_until should be: 2024-01-15

  // New visibility after deadline change
  const newVisibility = calculateVisibility(newDeadline, durationDays);
  // visible_from should be: 2024-01-20 - (3-1) = 2024-01-18
  // visible_until should be: 2024-01-20

  assert(initialVisibility.visible_from !== newVisibility.visible_from, 
    'visible_from should change when deadline changes');
  assert(initialVisibility.visible_until !== newVisibility.visible_until, 
    'visible_until should change when deadline changes');

  // Verify new values are correct
  const expectedNewFrom = formatISO(startOfDay(subDays(parseISO(newDeadline), durationDays - 1)), { representation: 'date' });
  const expectedNewUntil = formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' });
  
  assertEqual(newVisibility.visible_from, expectedNewFrom, 'visible_from should match formula');
  assertEqual(newVisibility.visible_until, expectedNewUntil, 'visible_until should match formula');
});

test('1.2: Changing deadline with duration_days=1 updates correctly', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const newDeadline = formatISO(startOfDay(new Date('2024-01-25')));
  const durationDays = 1;

  // For duration=1, visible_from and visible_until should both equal deadline
  const newVisibility = calculateVisibility(newDeadline, durationDays);
  
  const expectedFrom = formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' });
  const expectedUntil = formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' });

  assertEqual(newVisibility.visible_from, expectedFrom, 'visible_from should equal deadline for duration=1');
  assertEqual(newVisibility.visible_until, expectedUntil, 'visible_until should equal deadline for duration=1');
});

test('1.3: Changing deadline with long duration updates correctly', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const newDeadline = formatISO(startOfDay(new Date('2024-02-01')));
  const durationDays = 10;

  // New visibility after deadline change
  const newVisibility = calculateVisibility(newDeadline, durationDays);
  
  // visible_from should be: 2024-02-01 - (10-1) = 2024-01-23
  const expectedFrom = formatISO(startOfDay(subDays(parseISO(newDeadline), durationDays - 1)), { representation: 'date' });
  const expectedUntil = formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' });

  assertEqual(newVisibility.visible_from, expectedFrom, 'visible_from should be deadline - (duration-1)');
  assertEqual(newVisibility.visible_until, expectedUntil, 'visible_until should equal deadline');
});

// ============================================================================
// SECTION 2: Deadline + Duration Change Tests
// ============================================================================

section('2. Deadline and Duration Change Together');

test('2.1: Changing both deadline and duration recalculates correctly', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const initialDuration = 3;
  
  const newDeadline = formatISO(startOfDay(new Date('2024-01-25')));
  const newDuration = 5;

  // New visibility with both changed
  const newVisibility = calculateVisibility(newDeadline, newDuration);
  
  // visible_from should be: 2024-01-25 - (5-1) = 2024-01-21
  const expectedFrom = formatISO(startOfDay(subDays(parseISO(newDeadline), newDuration - 1)), { representation: 'date' });
  const expectedUntil = formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' });

  assertEqual(newVisibility.visible_from, expectedFrom, 
    'visible_from should reflect both new deadline and new duration');
  assertEqual(newVisibility.visible_until, expectedUntil, 
    'visible_until should reflect new deadline');
});

test('2.2: Increasing duration with same deadline extends visible_from earlier', () => {
  const deadline = formatISO(startOfDay(new Date('2024-01-20')));
  
  const shortDuration = calculateVisibility(deadline, 3);
  const longDuration = calculateVisibility(deadline, 7);

  // visible_until should be the same (same deadline)
  assertEqual(shortDuration.visible_until, longDuration.visible_until, 
    'visible_until should be same when deadline unchanged');

  // visible_from should be earlier for longer duration
  const shortFrom = parseISO(shortDuration.visible_from!);
  const longFrom = parseISO(longDuration.visible_from!);
  assert(longFrom < shortFrom, 
    'visible_from should be earlier for longer duration');
});

test('2.3: Moving deadline forward with same duration shifts entire range forward', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const newDeadline = formatISO(startOfDay(new Date('2024-01-25')));
  const durationDays = 5;

  const initialVisibility = calculateVisibility(initialDeadline, durationDays);
  const newVisibility = calculateVisibility(newDeadline, durationDays);

  // Both should shift forward by 10 days
  const initialFrom = parseISO(initialVisibility.visible_from!);
  const newFrom = parseISO(newVisibility.visible_from!);
  const initialUntil = parseISO(initialVisibility.visible_until!);
  const newUntil = parseISO(newVisibility.visible_until!);

  const fromDiff = (newFrom.getTime() - initialFrom.getTime()) / (1000 * 60 * 60 * 24);
  const untilDiff = (newUntil.getTime() - initialUntil.getTime()) / (1000 * 60 * 60 * 24);

  assertEqual(fromDiff, 10, 'visible_from should shift forward by deadline difference');
  assertEqual(untilDiff, 10, 'visible_until should shift forward by deadline difference');
});

// ============================================================================
// SECTION 3: Edge Cases
// ============================================================================

section('3. Edge Cases for Deadline Changes');

test('3.1: Changing deadline from null to date calculates visibility', () => {
  const initialVisibility = calculateVisibility(null, 3, formatISO(startOfDay(new Date('2024-01-10'))));
  const newDeadline = formatISO(startOfDay(new Date('2024-01-20')));
  const newVisibility = calculateVisibility(newDeadline, 3);

  // When deadline is null, visibility is calculated from start_date
  // When deadline is set, visibility should be calculated from deadline
  assert(newVisibility.visible_from !== null, 'visible_from should be set when deadline is added');
  assert(newVisibility.visible_until !== null, 'visible_until should be set when deadline is added');
  assertEqual(newVisibility.visible_until, formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' }), 
    'visible_until should equal deadline');
});

test('3.2: Changing deadline from date to null switches to start_date calculation', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-20')));
  const startDate = formatISO(startOfDay(new Date('2024-01-25')));
  const durationDays = 3;

  // Initial: calculated from deadline
  const initialVisibility = calculateVisibility(initialDeadline, durationDays);
  
  // New: calculated from start_date (deadline is null)
  const newVisibility = calculateVisibility(null, durationDays, startDate);

  // Visibility should switch from deadline-based to start_date-based
  assert(initialVisibility.visible_from !== newVisibility.visible_from, 
    'visible_from should change when switching from deadline to start_date');
  assert(initialVisibility.visible_until !== newVisibility.visible_until, 
    'visible_until should change when switching from deadline to start_date');

  // New visibility should be: visible_from = start_date, visible_until = start_date + (duration-1)
  const expectedFrom = formatISO(startOfDay(parseISO(startDate)), { representation: 'date' });
  const expectedUntil = formatISO(startOfDay(addDays(parseISO(startDate), durationDays - 1)), { representation: 'date' });

  assertEqual(newVisibility.visible_from, expectedFrom, 
    'visible_from should equal start_date when deadline is null');
  assertEqual(newVisibility.visible_until, expectedUntil, 
    'visible_until should be start_date + (duration-1) when deadline is null');
});

test('3.3: Changing deadline to earlier date updates visibility immediately', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-25')));
  const newDeadline = formatISO(startOfDay(new Date('2024-01-15'))); // 10 days earlier
  const durationDays = 5;

  const initialVisibility = calculateVisibility(initialDeadline, durationDays);
  const newVisibility = calculateVisibility(newDeadline, durationDays);

  // Both visible_from and visible_until should move earlier
  const initialFrom = parseISO(initialVisibility.visible_from!);
  const newFrom = parseISO(newVisibility.visible_from!);
  const initialUntil = parseISO(initialVisibility.visible_until!);
  const newUntil = parseISO(newVisibility.visible_until!);

  assert(newFrom < initialFrom, 'visible_from should move earlier');
  assert(newUntil < initialUntil, 'visible_until should move earlier');
  assertEqual((initialFrom.getTime() - newFrom.getTime()) / (1000 * 60 * 60 * 24), 10, 
    'visible_from should shift back by 10 days');
  assertEqual((initialUntil.getTime() - newUntil.getTime()) / (1000 * 60 * 60 * 24), 10, 
    'visible_until should shift back by 10 days');
});

test('3.4: Zero or negative duration defaults to 1 day', () => {
  const deadline = formatISO(startOfDay(new Date('2024-01-20')));

  const visibility0 = calculateVisibility(deadline, 0);
  const visibilityNeg = calculateVisibility(deadline, -5);
  const visibility1 = calculateVisibility(deadline, 1);

  // All should behave like duration=1
  assertEqual(visibility0.visible_from, visibility1.visible_from, 
    'Duration 0 should default to 1 day');
  assertEqual(visibility0.visible_until, visibility1.visible_until, 
    'Duration 0 should default to 1 day');
  assertEqual(visibilityNeg.visible_from, visibility1.visible_from, 
    'Negative duration should default to 1 day');
  assertEqual(visibilityNeg.visible_until, visibility1.visible_until, 
    'Negative duration should default to 1 day');
});

// ============================================================================
// SECTION 4: Simulated updateTask Logic Tests
// ============================================================================

section('4. Simulated updateTask Logic');

test('4.1: Simulated updateTask correctly recalculates visibility on deadline change', () => {
  // Simulate current task
  const currentTask: any = {
    id: 'task-1',
    deadline: formatISO(startOfDay(new Date('2024-01-15'))),
    duration_days: 3,
    visible_from: '2024-01-13', // Initial calculated value
    visible_until: '2024-01-15',
  };

  // Simulate update with new deadline
  const updates: any = {
    deadline: formatISO(startOfDay(new Date('2024-01-25'))),
  };

  // Simulate updateTask logic
  const finalDeadline = updates.deadline ?? currentTask.deadline;
  const finalDurationDays = updates.duration_days ?? currentTask.duration_days ?? null;
  const finalStartDate = updates.start_date ?? currentTask.start_date ?? null;
  
  const visibility = calculateVisibility(finalDeadline, finalDurationDays, finalStartDate);

  // Verify visibility was recalculated
  assert(visibility.visible_from !== currentTask.visible_from, 
    'visible_from should be recalculated');
  assert(visibility.visible_until !== currentTask.visible_until, 
    'visible_until should be recalculated');

  // Verify new values are correct
  const expectedFrom = formatISO(startOfDay(subDays(parseISO(finalDeadline), finalDurationDays - 1)), { representation: 'date' });
  const expectedUntil = formatISO(startOfDay(parseISO(finalDeadline)), { representation: 'date' });

  assertEqual(visibility.visible_from, expectedFrom, 
    'New visible_from should match formula');
  assertEqual(visibility.visible_until, expectedUntil, 
    'New visible_until should match formula');
});

test('4.2: Simulated updateTask preserves other fields when only deadline changes', () => {
  const currentTask: any = {
    id: 'task-1',
    title: 'Test Task',
    priority: 'high',
    deadline: formatISO(startOfDay(new Date('2024-01-15'))),
    duration_days: 3,
    visible_from: '2024-01-13',
    visible_until: '2024-01-15',
  };

  const updates: any = {
    deadline: formatISO(startOfDay(new Date('2024-01-25'))),
  };

  // Simulate updateTask logic
  const taskWithUpdates = {
    ...currentTask,
    ...updates,
  };

  const finalDeadline = taskWithUpdates.deadline ?? currentTask.deadline;
  const finalDurationDays = taskWithUpdates.duration_days ?? currentTask.duration_days ?? null;
  const finalStartDate = taskWithUpdates.start_date ?? currentTask.start_date ?? null;
  
  const visibility = calculateVisibility(finalDeadline, finalDurationDays, finalStartDate);

  const updatedTask = {
    ...taskWithUpdates,
    duration_days: finalDurationDays,
    visible_from: visibility.visible_from,
    visible_until: visibility.visible_until,
  };

  // Other fields should be preserved
  assertEqual(updatedTask.id, currentTask.id, 'ID should be preserved');
  assertEqual(updatedTask.title, currentTask.title, 'Title should be preserved');
  assertEqual(updatedTask.priority, currentTask.priority, 'Priority should be preserved');

  // Only visibility fields should change
  assert(updatedTask.visible_from !== currentTask.visible_from, 
    'visible_from should be updated');
  assert(updatedTask.visible_until !== currentTask.visible_until, 
    'visible_until should be updated');
});

test('4.3: Simulated updateTask handles partial update (only deadline in updates)', () => {
  const currentTask: any = {
    id: 'task-1',
    deadline: formatISO(startOfDay(new Date('2024-01-15'))),
    duration_days: 5,
    start_date: null,
    visible_from: '2024-01-11',
    visible_until: '2024-01-15',
  };

  // Update only deadline
  const updates: any = {
    deadline: formatISO(startOfDay(new Date('2024-01-30'))),
  };

  // Simulate updateTask logic
  const taskWithUpdates = {
    ...currentTask,
    ...updates,
  };

  const finalDeadline = taskWithUpdates.deadline ?? currentTask.deadline;
  const finalDurationDays = taskWithUpdates.duration_days ?? currentTask.duration_days ?? null;
  const finalStartDate = taskWithUpdates.start_date ?? currentTask.start_date ?? null;
  
  const visibility = calculateVisibility(finalDeadline, finalDurationDays, finalStartDate);

  // duration_days should be preserved from currentTask
  assertEqual(finalDurationDays, currentTask.duration_days, 
    'duration_days should be preserved when not in updates');

  // visibility should be recalculated with preserved duration
  const expectedFrom = formatISO(startOfDay(subDays(parseISO(finalDeadline), finalDurationDays - 1)), { representation: 'date' });
  assertEqual(visibility.visible_from, expectedFrom, 
    'visible_from should be recalculated with preserved duration');
});

// ============================================================================
// SECTION 5: Recurring Tasks Deadline Change
// ============================================================================

section('5. Recurring Tasks Deadline Changes');

test('5.1: Changing template deadline affects visibility calculation', () => {
  const templateDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const newTemplateDeadline = formatISO(startOfDay(new Date('2024-01-25')));
  const durationDays = 3;

  // Template visibility should be recalculated
  const initialVisibility = calculateVisibility(templateDeadline, durationDays);
  const newVisibility = calculateVisibility(newTemplateDeadline, durationDays);

  assert(initialVisibility.visible_from !== newVisibility.visible_from, 
    'Template visible_from should change when deadline changes');
  assert(initialVisibility.visible_until !== newVisibility.visible_until, 
    'Template visible_until should change when deadline changes');
});

test('5.2: Changing occurrence deadline affects its visibility independently', () => {
  // Each occurrence has its own deadline
  const occurrence1Deadline = formatISO(startOfDay(new Date('2024-01-15')));
  const occurrence2Deadline = formatISO(startOfDay(new Date('2024-01-22')));
  const durationDays = 3;

  const occurrence1Visibility = calculateVisibility(occurrence1Deadline, durationDays);
  const occurrence2Visibility = calculateVisibility(occurrence2Deadline, durationDays);

  // Each should have different visibility ranges
  assert(occurrence1Visibility.visible_from !== occurrence2Visibility.visible_from, 
    'Occurrences should have different visible_from');
  assert(occurrence1Visibility.visible_until !== occurrence2Visibility.visible_until, 
    'Occurrences should have different visible_until');
});

// ============================================================================
// SECTION 6: Integration with Visibility Formula (Problem 5)
// ============================================================================

section('6. Integration with Problem 5 Formula');

test('6.1: Visibility formula ensures task cannot disappear before deadline', () => {
  const deadline = formatISO(startOfDay(new Date('2024-01-20')));
  const durationDays = 5;

  const visibility = calculateVisibility(deadline, durationDays);

  // visible_until should ALWAYS equal deadline (formula: visible_until = deadline)
  assertEqual(visibility.visible_until, formatISO(startOfDay(parseISO(deadline)), { representation: 'date' }), 
    'visible_until must equal deadline to prevent premature disappearance');

  // visible_from should be deadline - (duration-1)
  const expectedFrom = formatISO(startOfDay(subDays(parseISO(deadline), durationDays - 1)), { representation: 'date' });
  assertEqual(visibility.visible_from, expectedFrom, 
    'visible_from should be deadline - (duration-1)');
});

test('6.2: Changing deadline maintains formula integrity', () => {
  const initialDeadline = formatISO(startOfDay(new Date('2024-01-15')));
  const newDeadline = formatISO(startOfDay(new Date('2024-02-01')));
  const durationDays = 7;

  const initialVisibility = calculateVisibility(initialDeadline, durationDays);
  const newVisibility = calculateVisibility(newDeadline, durationDays);

  // Both should follow the formula
  assertEqual(initialVisibility.visible_until, formatISO(startOfDay(parseISO(initialDeadline)), { representation: 'date' }), 
    'Initial visible_until must equal deadline');
  assertEqual(newVisibility.visible_until, formatISO(startOfDay(parseISO(newDeadline)), { representation: 'date' }), 
    'New visible_until must equal deadline');

  // Both should have correct visible_from
  const initialExpectedFrom = formatISO(startOfDay(subDays(parseISO(initialDeadline), durationDays - 1)), { representation: 'date' });
  const newExpectedFrom = formatISO(startOfDay(subDays(parseISO(newDeadline), durationDays - 1)), { representation: 'date' });

  assertEqual(initialVisibility.visible_from, initialExpectedFrom, 
    'Initial visible_from should follow formula');
  assertEqual(newVisibility.visible_from, newExpectedFrom, 
    'New visible_from should follow formula');
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

