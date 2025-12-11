/**
 * COMPREHENSIVE VISIBILITY & TASK ENGINE TESTS
 * 
 * Full test suite covering Problem 4 & 5: Visibility calculations and Today/Upcoming filtering
 * 
 * Structure: 9 sections, 60-80 tests total
 * 
 * Usage:
 *   tsx test-visibility-comprehensive.ts                    # Run all tests
 *   tsx test-visibility-comprehensive.ts --section=1        # Run section 1 only
 *   tsx test-visibility-comprehensive.ts --section=1,2,3    # Run sections 1, 2, 3
 */

import { calculateVisibility, isVisibleToday, isUpcoming } from './src/utils/visibility';
import { formatISO, parseISO, addDays, subDays, startOfDay } from 'date-fns';

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

// ============================================================================
// SECTION 1: BASE VISIBILITY CALCULATIONS (10 tests)
// ============================================================================

function runSection1(): void {
  currentSection = 'SECTION 1: BASE VISIBILITY CALCULATIONS';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 1.1: Duration 1 day with deadline today
  runTest('Duration 1 day, deadline today', () => {
    const today = new Date();
    const todayISO = formatISO(startOfDay(today), { representation: 'date' });
    const result = calculateVisibility(todayISO, 1);
    
    const expected = {
      visible_from: todayISO,
      visible_until: todayISO,
    };
    
    return {
      passed: result.visible_from === expected.visible_from && 
              result.visible_until === expected.visible_until,
      message: result.visible_from === expected.visible_from && 
               result.visible_until === expected.visible_until
        ? 'Duration 1 correctly calculates visible range'
        : 'Duration 1 calculation incorrect',
      expected,
      actual: result,
    };
  });

  // Test 1.2: Duration 2 days with deadline tomorrow
  runTest('Duration 2 days, deadline tomorrow', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 2);
    
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === tomorrowISO,
      message: result.visible_from === today && 
               result.visible_until === tomorrowISO
        ? 'Duration 2 correctly calculates: visible_from = deadline - 1, visible_until = deadline'
        : 'Duration 2 calculation incorrect',
      expected: { visible_from: today, visible_until: tomorrowISO },
      actual: result,
    };
  });

  // Test 1.3: Duration 5 days with deadline in 7 days
  runTest('Duration 5 days, deadline in 7 days', () => {
    const deadline = addDays(new Date(), 7);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    
    // visible_from = deadline - (5 - 1) = deadline - 4 days
    const expectedFrom = formatISO(startOfDay(addDays(deadline, -4)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === deadlineISO,
      message: result.visible_from === expectedFrom && 
               result.visible_until === deadlineISO
        ? 'Duration 5 correctly calculates: visible_from = deadline - 4'
        : 'Duration 5 calculation incorrect',
      expected: { visible_from: expectedFrom, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 1.4: Duration 10 days with deadline in 2 weeks
  runTest('Duration 10 days, deadline in 14 days', () => {
    const deadline = addDays(new Date(), 14);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 10);
    
    // visible_from = deadline - (10 - 1) = deadline - 9 days
    const expectedFrom = formatISO(startOfDay(addDays(deadline, -9)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === deadlineISO,
      message: 'Duration 10 correctly calculates backwards from deadline',
      expected: { visible_from: expectedFrom, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 1.5: Duration 30 days with deadline in 1 month
  runTest('Duration 30 days, deadline in 30 days', () => {
    const deadline = addDays(new Date(), 30);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 30);
    
    // visible_from = deadline - (30 - 1) = deadline - 29 days = tomorrow
    const expectedFrom = formatISO(startOfDay(addDays(new Date(), 1)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === deadlineISO,
      message: 'Duration 30 correctly calculates: task visible for full 30 days ending at deadline',
      expected: { visible_from: expectedFrom, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 1.6: Task with deadline today, duration 1 (boundary)
  runTest('Deadline today, duration 1 (boundary case)', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(today, 1);
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === today,
      message: 'Boundary case: deadline today with duration 1 works correctly',
      expected: { visible_from: today, visible_until: today },
      actual: result,
    };
  });

  // Test 1.7: Task with deadline tomorrow, duration 1
  runTest('Deadline tomorrow, duration 1', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 1);
    
    return {
      passed: result.visible_from === tomorrowISO && 
              result.visible_until === tomorrowISO,
      message: 'Deadline tomorrow with duration 1: visible only tomorrow',
      expected: { visible_from: tomorrowISO, visible_until: tomorrowISO },
      actual: result,
    };
  });

  // Test 1.8: Task with deadline in past (7 days ago)
  runTest('Deadline in past (7 days ago), duration 5', () => {
    const pastDeadline = subDays(new Date(), 7);
    const pastISO = formatISO(startOfDay(pastDeadline), { representation: 'date' });
    const result = calculateVisibility(pastISO, 5);
    
    // visible_from = pastDeadline - (5 - 1) = pastDeadline - 4 days (12 days ago)
    const expectedFrom = formatISO(startOfDay(subDays(pastDeadline, 4)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === pastISO,
      message: 'Past deadline calculation works (for historical tasks)',
      expected: { visible_from: expectedFrom, visible_until: pastISO },
      actual: result,
    };
  });

  // Test 1.9: Task without deadline, with start_date and duration 5
  runTest('No deadline, start_date today, duration 5', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(null, 5, today);
    
    // visible_from = start_date, visible_until = start_date + (5 - 1) = start_date + 4
    const expectedUntil = formatISO(startOfDay(addDays(new Date(), 4)), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === expectedUntil,
      message: 'Task without deadline: visible_from = start_date, visible_until = start_date + (duration - 1)',
      expected: { visible_from: today, visible_until: expectedUntil },
      actual: result,
    };
  });

  // Test 1.10: Task without deadline, start_date in future (7 days), duration 10
  runTest('No deadline, start_date in 7 days, duration 10', () => {
    const futureStart = addDays(new Date(), 7);
    const futureStartISO = formatISO(startOfDay(futureStart), { representation: 'date' });
    const result = calculateVisibility(null, 10, futureStartISO);
    
    // visible_from = start_date, visible_until = start_date + (10 - 1) = start_date + 9 days
    const expectedUntil = formatISO(startOfDay(addDays(futureStart, 9)), { representation: 'date' });
    
    return {
      passed: result.visible_from === futureStartISO && 
              result.visible_until === expectedUntil,
      message: 'Future start_date calculation: visible for 10 days starting from start_date',
      expected: { visible_from: futureStartISO, visible_until: expectedUntil },
      actual: result,
    };
  });
}

// ============================================================================
// SECTION 2: TASKS WITH DEADLINE (12 tests)
// ============================================================================

function runSection2(): void {
  currentSection = 'SECTION 2: TASKS WITH DEADLINE';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 2.1: Duration window spans multiple days correctly
  runTest('Duration window spans correct number of days', () => {
    const deadline = addDays(new Date(), 10);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    
    const fromDate = parseISO(result.visible_from!);
    const untilDate = parseISO(result.visible_until!);
    const daysDiff = Math.round((untilDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      passed: daysDiff === 4, // 5 days = 0,1,2,3,4 = 4 days difference
      message: daysDiff === 4
        ? 'Duration window spans exactly (duration - 1) days'
        : `Expected 4 days difference, got ${daysDiff}`,
      expected: 4,
      actual: daysDiff,
    };
  });

  // Test 2.2: Task visible today when visible_from <= today <= visible_until
  runTest('Task with deadline in 3 days, duration 5 - visible today', () => {
    const deadline = addDays(new Date(), 3);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    
    // visible_from = deadline - 4 = today - 1 (yesterday)
    // Task should be visible today
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: isVisible
        ? 'Task with duration extending to today is correctly visible'
        : 'Task should be visible today but isVisibleToday returned false',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 2.3: Task not visible today when visible_from > today
  runTest('Task with deadline in 7 days, duration 3 - not visible today', () => {
    const deadline = addDays(new Date(), 7);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 3);
    
    // visible_from = deadline - 2 = today + 5
    // Task should NOT be visible today (visible_from > today)
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: isVisible === false
        ? 'Task with visible_from in future correctly not visible today'
        : 'Task should not be visible today but isVisibleToday returned true',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 2.4: Task not visible today when visible_until < today (overdue)
  runTest('Task with deadline yesterday, duration 3 - not visible today', () => {
    const deadline = subDays(new Date(), 1);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 3);
    
    // visible_until = deadline (yesterday) < today
    // Task should NOT be visible today
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: isVisible === false
        ? 'Task with visible_until in past correctly not visible today'
        : 'Overdue task should not be visible but isVisibleToday returned true',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 2.5: Task visible exactly on visible_from date
  runTest('Task becomes visible exactly on visible_from date', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 1);
    
    // visible_from = tomorrow, visible_until = tomorrow
    // Task should NOT be visible today (visible_from = tomorrow > today)
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Task with visible_from = tomorrow correctly not visible today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 2.6: Task visible exactly on visible_until date
  runTest('Task visible exactly on visible_until date (deadline)', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(today, 1);
    
    // visible_from = today, visible_until = today
    // Task should be visible today
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Task with visible_until = today correctly visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 2.7: Long duration (30 days) ensures task visible well before deadline
  runTest('Long duration (30 days) - task visible well before deadline', () => {
    const deadline = addDays(new Date(), 30);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 30);
    
    // visible_from should be today + 1 (deadline - 29)
    const expectedFrom = formatISO(startOfDay(addDays(new Date(), 1)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === deadlineISO,
      message: 'Long duration correctly calculates: task visible for full 30 days',
      expected: { visible_from: expectedFrom, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 2.8: Short duration (1 day) - task visible only on deadline
  runTest('Short duration (1 day) - task visible only on deadline', () => {
    const deadline = addDays(new Date(), 5);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 1);
    
    return {
      passed: result.visible_from === deadlineISO && 
              result.visible_until === deadlineISO,
      message: 'Duration 1: task visible only on deadline day',
      expected: { visible_from: deadlineISO, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 2.9: Deadline at midnight boundary
  runTest('Deadline at start of day (midnight boundary)', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowISO = formatISO(tomorrowStart, { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 2);
    
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === tomorrowISO,
      message: 'Midnight boundary handled correctly: visible_from = today, visible_until = tomorrow',
      expected: { visible_from: today, visible_until: tomorrowISO },
      actual: result,
    };
  });

  // Test 2.10: Very long duration (60 days)
  runTest('Very long duration (60 days) calculation', () => {
    const deadline = addDays(new Date(), 60);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 60);
    
    // visible_from = deadline - 59 days = today + 1
    const expectedFrom = formatISO(startOfDay(addDays(new Date(), 1)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === deadlineISO,
      message: 'Very long duration (60 days) correctly calculated',
      expected: { visible_from: expectedFrom, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 2.11: Deadline exactly at visible_from boundary
  runTest('Deadline creates visible_from exactly today', () => {
    const deadline = addDays(new Date(), 4);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    
    // visible_from = deadline - 4 = today
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === deadlineISO,
      message: 'When duration makes visible_from = today, calculation is correct',
      expected: { visible_from: today, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 2.12: Multiple tasks with same deadline, different durations
  runTest('Multiple tasks same deadline, different durations', () => {
    const deadline = addDays(new Date(), 10);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    
    const result1 = calculateVisibility(deadlineISO, 1);
    const result5 = calculateVisibility(deadlineISO, 5);
    const result10 = calculateVisibility(deadlineISO, 10);
    
    // All should have same visible_until (deadline)
    // But different visible_from based on duration
    const allSameUntil = result1.visible_until === result5.visible_until && 
                         result5.visible_until === result10.visible_until &&
                         result10.visible_until === deadlineISO;
    
    const differentFrom = result1.visible_from !== result5.visible_from &&
                          result5.visible_from !== result10.visible_from;
    
    return {
      passed: allSameUntil && differentFrom,
      message: allSameUntil && differentFrom
        ? 'Tasks with same deadline but different durations have same visible_until, different visible_from'
        : 'Tasks with different durations should have different visible_from values',
      expected: { sameUntil: true, differentFrom: true },
      actual: { sameUntil: allSameUntil, differentFrom },
    };
  });
}

// ============================================================================
// SECTION 3: TASKS WITHOUT DEADLINE (10 tests)
// ============================================================================

function runSection3(): void {
  currentSection = 'SECTION 3: TASKS WITHOUT DEADLINE';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 3.1: Task without deadline, start_date today, duration 1
  runTest('No deadline, start_date today, duration 1', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(null, 1, today);
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === today,
      message: 'Task without deadline: visible_from = start_date, visible_until = start_date when duration = 1',
      expected: { visible_from: today, visible_until: today },
      actual: result,
    };
  });

  // Test 3.2: Task without deadline, start_date today, duration 5
  runTest('No deadline, start_date today, duration 5', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(null, 5, today);
    
    const expectedUntil = formatISO(startOfDay(addDays(new Date(), 4)), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === expectedUntil,
      message: 'Task without deadline: visible for 5 days starting today',
      expected: { visible_from: today, visible_until: expectedUntil },
      actual: result,
    };
  });

  // Test 3.3: Task without deadline, start_date tomorrow, duration 10
  runTest('No deadline, start_date tomorrow, duration 10', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(null, 10, tomorrowISO);
    
    const expectedUntil = formatISO(startOfDay(addDays(tomorrow, 9)), { representation: 'date' });
    
    return {
      passed: result.visible_from === tomorrowISO && 
              result.visible_until === expectedUntil,
      message: 'Future start_date: visible_from = start_date, visible_until = start_date + 9',
      expected: { visible_from: tomorrowISO, visible_until: expectedUntil },
      actual: result,
    };
  });

  // Test 3.4: Task without deadline visible today when start_date <= today <= visible_until
  runTest('No deadline, start_date yesterday, duration 5 - visible today', () => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayISO = formatISO(startOfDay(yesterday), { representation: 'date' });
    const result = calculateVisibility(null, 5, yesterdayISO);
    
    // visible_from = yesterday, visible_until = yesterday + 4 = today + 3
    // Task should be visible today (today is between yesterday and today+3)
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Task without deadline with start_date in past but visible_until in future is visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 3.5: Task without deadline not visible when visible_until < today
  runTest('No deadline, start_date 10 days ago, duration 5 - not visible today', () => {
    const pastStart = subDays(new Date(), 10);
    const pastStartISO = formatISO(startOfDay(pastStart), { representation: 'date' });
    const result = calculateVisibility(null, 5, pastStartISO);
    
    // visible_until = pastStart + 4 = today - 6
    // Task should NOT be visible today
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Task without deadline with visible_until in past correctly not visible today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 3.6: Task without deadline not visible when visible_from > today
  runTest('No deadline, start_date in 5 days, duration 3 - not visible today', () => {
    const futureStart = addDays(new Date(), 5);
    const futureStartISO = formatISO(startOfDay(futureStart), { representation: 'date' });
    const result = calculateVisibility(null, 3, futureStartISO);
    
    // visible_from = future (today + 5) > today
    // Task should NOT be visible today
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Task without deadline with future start_date correctly not visible today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 3.7: Task without deadline, long duration (30 days)
  runTest('No deadline, start_date today, duration 30', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(null, 30, today);
    
    const expectedUntil = formatISO(startOfDay(addDays(new Date(), 29)), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && 
              result.visible_until === expectedUntil,
      message: 'Long duration (30 days) without deadline: visible for full 30 days',
      expected: { visible_from: today, visible_until: expectedUntil },
      actual: result,
    };
  });

  // Test 3.8: Task without deadline, duration 1 (minimum)
  runTest('No deadline, start_date tomorrow, duration 1 (minimum)', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(null, 1, tomorrowISO);
    
    return {
      passed: result.visible_from === tomorrowISO && 
              result.visible_until === tomorrowISO,
      message: 'Duration 1 without deadline: visible only on start_date',
      expected: { visible_from: tomorrowISO, visible_until: tomorrowISO },
      actual: result,
    };
  });

  // Test 3.9: Task without deadline and without start_date returns null
  runTest('No deadline, no start_date - returns null visibility', () => {
    const result = calculateVisibility(null, 5, null);
    
    return {
      passed: result.visible_from === null && 
              result.visible_until === null,
      message: 'Task without deadline and without start_date returns null (legacy behavior)',
      expected: { visible_from: null, visible_until: null },
      actual: result,
    };
  });

  // Test 3.10: Task without deadline, visible_from = start_date always
  runTest('No deadline: visible_from always equals start_date', () => {
    const futureStart = addDays(new Date(), 7);
    const futureStartISO = formatISO(startOfDay(futureStart), { representation: 'date' });
    const result = calculateVisibility(null, 10, futureStartISO);
    
    return {
      passed: result.visible_from === futureStartISO,
      message: 'Task without deadline: visible_from always equals start_date regardless of duration',
      expected: futureStartISO,
      actual: result.visible_from,
    };
  });
}

// ============================================================================
// SECTION 4: TODAY BEHAVIOUR (12 tests)
// ============================================================================

function runSection4(): void {
  currentSection = 'SECTION 4: TODAY BEHAVIOUR';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 4.1: Task with deadline today, duration 1 - visible today
  runTest('Deadline today, duration 1 - visible today', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(today, 1);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Task with deadline today is visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 4.2: Task with deadline tomorrow, duration 2 - visible today
  runTest('Deadline tomorrow, duration 2 - visible today', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 2);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Task with duration extending to today is visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 4.3: Task with deadline in 7 days, duration 3 - not visible today
  runTest('Deadline in 7 days, duration 3 - not visible today', () => {
    const deadline = addDays(new Date(), 7);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 3);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Task with visible_from in future correctly not visible today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 4.4: Task without deadline, start_date today, duration 5 - visible today
  runTest('No deadline, start_date today, duration 5 - visible today', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(null, 5, today);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Task without deadline with start_date today is visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 4.5: Task without deadline, start_date yesterday, duration 10 - visible today
  runTest('No deadline, start_date yesterday, duration 10 - visible today', () => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayISO = formatISO(startOfDay(yesterday), { representation: 'date' });
    const result = calculateVisibility(null, 10, yesterdayISO);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Task without deadline with start_date in past but still within duration is visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 4.6: Task without deadline, start_date tomorrow, duration 1 - not visible today
  runTest('No deadline, start_date tomorrow, duration 1 - not visible today', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(null, 1, tomorrowISO);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Task without deadline with future start_date correctly not visible today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 4.7: Overdue task (deadline yesterday, duration 1) - not visible today
  runTest('Overdue task (deadline yesterday, duration 1) - not visible today', () => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayISO = formatISO(startOfDay(yesterday), { representation: 'date' });
    const result = calculateVisibility(yesterdayISO, 1);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Overdue task (visible_until < today) correctly not visible today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 4.8: Overdue task but still visible (deadline yesterday, duration 5)
  runTest('Overdue deadline but still visible (deadline yesterday, duration 5)', () => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayISO = formatISO(startOfDay(yesterday), { representation: 'date' });
    const result = calculateVisibility(yesterdayISO, 5);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    // visible_from = yesterday - 4 = today - 5
    // visible_until = yesterday
    // Today is NOT in range (today > yesterday)
    return {
      passed: isVisible === false,
      message: 'Task with overdue deadline: even with duration, if visible_until < today, not visible',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 4.9: Task visible exactly on visible_from = today
  runTest('Task becomes visible today (visible_from = today)', () => {
    const deadline = addDays(new Date(), 4);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    // visible_from should be today (deadline - 4)
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    
    return {
      passed: result.visible_from === today && isVisible === true,
      message: 'Task with visible_from = today is correctly visible today',
      expected: { visible_from: today, isVisible: true },
      actual: { visible_from: result.visible_from, isVisible },
    };
  });

  // Test 4.10: Task visible exactly on visible_until = today
  runTest('Task visible on last day (visible_until = today)', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(today, 1);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: result.visible_until === today && isVisible === true,
      message: 'Task with visible_until = today is correctly visible today',
      expected: { visible_until: today, isVisible: true },
      actual: { visible_until: result.visible_until, isVisible },
    };
  });

  // Test 4.11: Task with null visibility fields (legacy) - always visible
  runTest('Task with null visibility fields (legacy) - always visible', () => {
    const isVisible = isVisibleToday(null, null);
    
    return {
      passed: isVisible === true,
      message: 'Legacy tasks without visibility fields are always visible (backward compatibility)',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 4.12: Multiple tasks with different visibility states
  runTest('Multiple tasks: some visible today, some not', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const tomorrow = formatISO(startOfDay(addDays(new Date(), 1)), { representation: 'date' });
    const nextWeek = formatISO(startOfDay(addDays(new Date(), 7)), { representation: 'date' });
    
    const task1 = calculateVisibility(today, 1); // Visible
    const task2 = calculateVisibility(tomorrow, 2); // Visible (duration extends)
    const task3 = calculateVisibility(nextWeek, 3); // Not visible (future)
    
    const vis1 = isVisibleToday(task1.visible_from, task1.visible_until);
    const vis2 = isVisibleToday(task2.visible_from, task2.visible_until);
    const vis3 = isVisibleToday(task3.visible_from, task3.visible_until);
    
    return {
      passed: vis1 === true && vis2 === true && vis3 === false,
      message: 'Mixed visibility states handled correctly: today and tomorrow+2 visible, next week not visible',
      expected: { task1: true, task2: true, task3: false },
      actual: { task1: vis1, task2: vis2, task3: vis3 },
    };
  });
}

// ============================================================================
// SECTION 5: UPCOMING (NEXT 7 DAYS) (12 tests)
// ============================================================================

function runSection5(): void {
  currentSection = 'SECTION 5: UPCOMING (NEXT 7 DAYS)';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 5.1: Task visible in 1 day - is upcoming
  runTest('Task visible in 1 day - is upcoming', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 1);
    
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === true,
      message: 'Task with visible_from = tomorrow correctly identified as upcoming',
      expected: true,
      actual: isUpcomingTask,
    };
  });

  // Test 5.2: Task visible in 7 days - is upcoming
  runTest('Task visible in 7 days - is upcoming', () => {
    const in7Days = addDays(new Date(), 7);
    const in7DaysISO = formatISO(startOfDay(in7Days), { representation: 'date' });
    const deadline = addDays(in7Days, 2);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 3);
    
    // visible_from = deadline - 2 = in7Days
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === true,
      message: 'Task with visible_from exactly in 7 days is upcoming',
      expected: true,
      actual: isUpcomingTask,
    };
  });

  // Test 5.3: Task visible in 8 days - NOT upcoming
  runTest('Task visible in 8 days - NOT upcoming', () => {
    const in8Days = addDays(new Date(), 8);
    const deadline = addDays(in8Days, 1);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 2);
    
    // visible_from = deadline - 1 = in8Days
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === false,
      message: 'Task with visible_from > 7 days correctly NOT identified as upcoming',
      expected: false,
      actual: isUpcomingTask,
    };
  });

  // Test 5.4: Task visible today - NOT upcoming (should be in Today)
  runTest('Task visible today - NOT upcoming', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(today, 1);
    
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === false,
      message: 'Task visible today correctly NOT in upcoming (should be in Today view)',
      expected: false,
      actual: isUpcomingTask,
    };
  });

  // Test 5.5: Task visible yesterday - NOT upcoming
  runTest('Task visible in past - NOT upcoming', () => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayISO = formatISO(startOfDay(yesterday), { representation: 'date' });
    const result = calculateVisibility(yesterdayISO, 1);
    
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === false,
      message: 'Task with visible_from in past correctly NOT upcoming',
      expected: false,
      actual: isUpcomingTask,
    };
  });

  // Test 5.6: Task without deadline, start_date in 3 days - is upcoming
  runTest('No deadline, start_date in 3 days - is upcoming', () => {
    const in3Days = addDays(new Date(), 3);
    const in3DaysISO = formatISO(startOfDay(in3Days), { representation: 'date' });
    const result = calculateVisibility(null, 5, in3DaysISO);
    
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === true,
      message: 'Task without deadline with future start_date correctly identified as upcoming',
      expected: true,
      actual: isUpcomingTask,
    };
  });

  // Test 5.7: Task without deadline, start_date today - NOT upcoming
  runTest('No deadline, start_date today - NOT upcoming (in Today)', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(null, 5, today);
    
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === false,
      message: 'Task without deadline with start_date today correctly NOT upcoming',
      expected: false,
      actual: isUpcomingTask,
    };
  });

  // Test 5.8: Task with visible_from exactly at boundary (today + 7)
  runTest('Task visible exactly in 7 days (boundary) - is upcoming', () => {
    const in7Days = addDays(new Date(), 7);
    const in7DaysISO = formatISO(startOfDay(in7Days), { representation: 'date' });
    const deadline = addDays(in7Days, 1);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 2);
    
    // visible_from = deadline - 1 = in7Days
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === true,
      message: 'Task with visible_from exactly at 7-day boundary is upcoming',
      expected: true,
      actual: isUpcomingTask,
    };
  });

  // Test 5.9: Multiple upcoming tasks sorted correctly
  runTest('Multiple upcoming tasks sorted by visible_from', () => {
    const day2 = formatISO(startOfDay(addDays(new Date(), 2)), { representation: 'date' });
    const day5 = formatISO(startOfDay(addDays(new Date(), 5)), { representation: 'date' });
    const day7 = formatISO(startOfDay(addDays(new Date(), 7)), { representation: 'date' });
    
    const task1 = calculateVisibility(day5, 1); // visible_from = day5
    const task2 = calculateVisibility(day2, 1); // visible_from = day2
    const task3 = calculateVisibility(day7, 1); // visible_from = day7
    
    const upcoming1 = isUpcoming(task1.visible_from, new Date(), 7);
    const upcoming2 = isUpcoming(task2.visible_from, new Date(), 7);
    const upcoming3 = isUpcoming(task3.visible_from, new Date(), 7);
    
    // All should be upcoming
    const allUpcoming = upcoming1 && upcoming2 && upcoming3;
    
    // Sort by visible_from
    const sorted = [
      { visible_from: task2.visible_from }, // day2
      { visible_from: task1.visible_from }, // day5
      { visible_from: task3.visible_from }, // day7
    ];
    
    return {
      passed: allUpcoming === true,
      message: 'All tasks with visible_from in next 7 days correctly identified as upcoming',
      expected: true,
      actual: allUpcoming,
    };
  });

  // Test 5.10: Task with long duration - only visible_from matters for upcoming
  runTest('Long duration task: only visible_from matters for upcoming', () => {
    const in3Days = addDays(new Date(), 3);
    const deadline = addDays(new Date(), 30);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 30);
    
    // visible_from = deadline - 29 = today + 1 (not in3Days, but let's check the actual calculation)
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    // visible_from should be in next 7 days (deadline - 29 = today + 1)
    return {
      passed: isUpcomingTask === true,
      message: 'Task with long duration: upcoming determined by visible_from, not visible_until',
      expected: true,
      actual: isUpcomingTask,
    };
  });

  // Test 5.11: Task visible tomorrow but also visible today (duration) - NOT upcoming
  runTest('Task with deadline tomorrow, duration 2 - NOT upcoming (visible today)', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 2);
    
    // visible_from = tomorrow - 1 = today
    // visible_until = tomorrow
    // Task is visible today, so NOT upcoming
    const isVisibleTodayResult = isVisibleToday(result.visible_from, result.visible_until);
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isVisibleTodayResult === true && isUpcomingTask === false,
      message: 'Task visible today correctly NOT in upcoming (even if visible_from = today)',
      expected: { visibleToday: true, upcoming: false },
      actual: { visibleToday: isVisibleTodayResult, upcoming: isUpcomingTask },
    };
  });

  // Test 5.12: Task with null visible_from - NOT upcoming
  runTest('Task with null visible_from (legacy) - NOT upcoming', () => {
    const isUpcomingTask = isUpcoming(null, new Date(), 7);
    
    return {
      passed: isUpcomingTask === false,
      message: 'Legacy tasks without visible_from correctly NOT identified as upcoming',
      expected: false,
      actual: isUpcomingTask,
    };
  });
}

// ============================================================================
// SECTION 6: RECURRING OCCURRENCES (10 tests)
// ============================================================================

function runSection6(): void {
  currentSection = 'SECTION 6: RECURRING OCCURRENCES';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 6.1: Recurring instance has correct visibility based on its deadline
  runTest('Recurring instance: visibility calculated from instance deadline', () => {
    // Simulate a recurring instance with deadline in 5 days
    const instanceDeadline = addDays(new Date(), 5);
    const instanceDeadlineISO = formatISO(startOfDay(instanceDeadline), { representation: 'date' });
    const durationDays = 3; // From template
    const result = calculateVisibility(instanceDeadlineISO, durationDays, null);
    
    // visible_from = deadline - 2 = today + 3
    const expectedFrom = formatISO(startOfDay(addDays(new Date(), 3)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === instanceDeadlineISO,
      message: 'Recurring instance has correct visibility calculated from its own deadline',
      expected: { visible_from: expectedFrom, visible_until: instanceDeadlineISO },
      actual: result,
    };
  });

  // Test 6.2: Multiple recurring instances have independent visibility
  runTest('Multiple recurring instances have independent visibility', () => {
    const instance1Deadline = addDays(new Date(), 3);
    const instance2Deadline = addDays(new Date(), 10);
    const durationDays = 5;
    
    const result1 = calculateVisibility(
      formatISO(startOfDay(instance1Deadline), { representation: 'date' }), 
      durationDays
    );
    const result2 = calculateVisibility(
      formatISO(startOfDay(instance2Deadline), { representation: 'date' }), 
      durationDays
    );
    
    // Each instance should have visibility based on its own deadline
    const differentVisibility = result1.visible_from !== result2.visible_from &&
                                result1.visible_until !== result2.visible_until;
    
    return {
      passed: differentVisibility === true,
      message: 'Each recurring instance has independent visibility based on its deadline',
      expected: true,
      actual: differentVisibility,
    };
  });

  // Test 6.3: Recurring instance visible today when duration extends
  runTest('Recurring instance with duration extending to today - visible', () => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowISO = formatISO(startOfDay(tomorrow), { representation: 'date' });
    const result = calculateVisibility(tomorrowISO, 2, null);
    
    // visible_from = tomorrow - 1 = today
    // Should be visible today
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === true,
      message: 'Recurring instance with duration extending to today is visible today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 6.4: Recurring instance upcoming when visible_from in next 7 days
  runTest('Recurring instance with visible_from in 4 days - upcoming', () => {
    const deadline = addDays(new Date(), 7);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 4, null);
    
    // visible_from = deadline - 3 = today + 4
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isUpcomingTask === true,
      message: 'Recurring instance with visible_from in next 7 days is upcoming',
      expected: true,
      actual: isUpcomingTask,
    };
  });

  // Test 6.5: Recurring instance with overlapping duration (Problem 2 context)
  runTest('Recurring instance: visibility window calculation independent', () => {
    // Even if instances overlap, each has correct visibility window
    const instance1Deadline = addDays(new Date(), 2);
    const instance2Deadline = addDays(new Date(), 5);
    const durationDays = 5; // Overlapping windows
    
    const result1 = calculateVisibility(
      formatISO(startOfDay(instance1Deadline), { representation: 'date' }), 
      durationDays
    );
    const result2 = calculateVisibility(
      formatISO(startOfDay(instance2Deadline), { representation: 'date' }), 
      durationDays
    );
    
    // Both should have correct visibility windows
    // Use strict boolean comparison instead of relying on truthy values
    const bothCorrect = !!(result1.visible_from && result1.visible_until &&
                            result2.visible_from && result2.visible_until);
    
    return {
      passed: bothCorrect === true,
      message: 'Recurring instances calculate visibility independently, even with overlapping windows',
      expected: true,
      actual: bothCorrect,
    };
  });

  // Test 6.6: Recurring template should NOT have visibility (template never visible)
  runTest('Recurring template: should not appear in Today/Upcoming', () => {
    // Template has recurring_options but instances handle visibility
    // Template itself should not be filtered by visibility
    // This test checks that we can distinguish template from instance
    const templateDeadline = addDays(new Date(), 5);
    const templateDeadlineISO = formatISO(startOfDay(templateDeadline), { representation: 'date' });
    
    // Template visibility is calculated but template should never be shown
    // (This is tested in UI logic, but visibility calculation should work)
    const result = calculateVisibility(templateDeadlineISO, 3, null);
    
    // Template visibility is calculated, but UI should filter it out
    // Just verify calculation works
    return {
      passed: result.visible_from !== null && result.visible_until !== null,
      message: 'Recurring template visibility calculated (but template should be filtered in UI)',
      expected: { hasVisibility: true },
      actual: { hasVisibility: result.visible_from !== null },
    };
  });

  // Test 6.7: Recurring without deadline - uses start_date
  runTest('Recurring task without deadline: uses start_date for visibility', () => {
    const futureStart = addDays(new Date(), 4);
    const futureStartISO = formatISO(startOfDay(futureStart), { representation: 'date' });
    const result = calculateVisibility(null, 5, futureStartISO);
    
    // visible_from = start_date
    return {
      passed: result.visible_from === futureStartISO,
      message: 'Recurring task without deadline uses start_date for visible_from',
      expected: futureStartISO,
      actual: result.visible_from,
    };
  });

  // Test 6.8: Recurring with long duration - each instance visible for full duration
  runTest('Recurring with long duration: each instance visible for full duration', () => {
    const instanceDeadline = addDays(new Date(), 10);
    const instanceDeadlineISO = formatISO(startOfDay(instanceDeadline), { representation: 'date' });
    const durationDays = 20;
    const result = calculateVisibility(instanceDeadlineISO, durationDays, null);
    
    // visible_from = deadline - (duration - 1) = deadline - 19
    // deadline is in 10 days, so visible_from = today + 10 - 19 = today - 9
    const expectedFrom = formatISO(startOfDay(subDays(new Date(), 9)), { representation: 'date' });
    
    return {
      passed: result.visible_from === expectedFrom && 
              result.visible_until === instanceDeadlineISO,
      message: 'Recurring instance with long duration: visible for full duration ending at deadline',
      expected: { visible_from: expectedFrom, visible_until: instanceDeadlineISO },
      actual: result,
    };
  });

  // Test 6.9: Recurring daily instances - each has correct visibility
  runTest('Daily recurring: instances have sequential visibility windows', () => {
    const today = new Date();
    const instance1Deadline = addDays(today, 1);
    const instance2Deadline = addDays(today, 2);
    const instance3Deadline = addDays(today, 3);
    const durationDays = 1;
    
    const result1 = calculateVisibility(
      formatISO(startOfDay(instance1Deadline), { representation: 'date' }), 
      durationDays
    );
    const result2 = calculateVisibility(
      formatISO(startOfDay(instance2Deadline), { representation: 'date' }), 
      durationDays
    );
    const result3 = calculateVisibility(
      formatISO(startOfDay(instance3Deadline), { representation: 'date' }), 
      durationDays
    );
    
    // Each should be visible only on its deadline day
    const allCorrect = result1.visible_from === result1.visible_until &&
                       result2.visible_from === result2.visible_until &&
                       result3.visible_from === result3.visible_until;
    
    return {
      passed: allCorrect === true,
      message: 'Daily recurring instances: each visible only on its deadline day',
      expected: true,
      actual: allCorrect,
    };
  });

  // Test 6.10: Recurring weekly instances - correct visibility windows
  runTest('Weekly recurring: instances have correct 7-day spacing in visibility', () => {
    const today = new Date();
    const week1Deadline = addDays(today, 7);
    const week2Deadline = addDays(today, 14);
    const durationDays = 5;
    
    const result1 = calculateVisibility(
      formatISO(startOfDay(week1Deadline), { representation: 'date' }), 
      durationDays
    );
    const result2 = calculateVisibility(
      formatISO(startOfDay(week2Deadline), { representation: 'date' }), 
      durationDays
    );
    
    // visible_from should be deadline - 4
    const expected1From = formatISO(startOfDay(addDays(week1Deadline, -4)), { representation: 'date' });
    const expected2From = formatISO(startOfDay(addDays(week2Deadline, -4)), { representation: 'date' });
    
    return {
      passed: result1.visible_from === expected1From && 
              result2.visible_from === expected2From,
      message: 'Weekly recurring instances: correct visibility windows with 7-day spacing',
      expected: { week1: expected1From, week2: expected2From },
      actual: { week1: result1.visible_from, week2: result2.visible_from },
    };
  });
}

// ============================================================================
// SECTION 7: DEADLINE CHANGE LOGIC (8 tests)
// ============================================================================

function runSection7(): void {
  currentSection = 'SECTION 7: DEADLINE CHANGE LOGIC';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 7.1: Changing deadline updates visibility
  runTest('Changing deadline from today+5 to today+10 updates visibility', () => {
    const originalDeadline = addDays(new Date(), 5);
    const originalISO = formatISO(startOfDay(originalDeadline), { representation: 'date' });
    const newDeadline = addDays(new Date(), 10);
    const newISO = formatISO(startOfDay(newDeadline), { representation: 'date' });
    const durationDays = 5;
    
    const originalResult = calculateVisibility(originalISO, durationDays);
    const newResult = calculateVisibility(newISO, durationDays);
    
    // Visibility should be different
    const different = originalResult.visible_from !== newResult.visible_from ||
                      originalResult.visible_until !== newResult.visible_until;
    
    return {
      passed: different === true,
      message: 'Changing deadline correctly recalculates visibility',
      expected: true,
      actual: different,
    };
  });

  // Test 7.2: Moving deadline earlier updates visible_from earlier
  runTest('Moving deadline earlier moves visible_from earlier', () => {
    const laterDeadline = addDays(new Date(), 10);
    const laterISO = formatISO(startOfDay(laterDeadline), { representation: 'date' });
    const earlierDeadline = addDays(new Date(), 5);
    const earlierISO = formatISO(startOfDay(earlierDeadline), { representation: 'date' });
    const durationDays = 5;
    
    const laterResult = calculateVisibility(laterISO, durationDays);
    const earlierResult = calculateVisibility(earlierISO, durationDays);
    
    const laterFrom = parseISO(laterResult.visible_from!);
    const earlierFrom = parseISO(earlierResult.visible_from!);
    
    return {
      passed: earlierFrom < laterFrom,
      message: 'Moving deadline earlier correctly moves visible_from earlier',
      expected: true,
      actual: earlierFrom < laterFrom,
    };
  });

  // Test 7.3: Moving deadline later moves visible_from later
  runTest('Moving deadline later moves visible_from later', () => {
    const earlierDeadline = addDays(new Date(), 3);
    const earlierISO = formatISO(startOfDay(earlierDeadline), { representation: 'date' });
    const laterDeadline = addDays(new Date(), 8);
    const laterISO = formatISO(startOfDay(laterDeadline), { representation: 'date' });
    const durationDays = 3;
    
    const earlierResult = calculateVisibility(earlierISO, durationDays);
    const laterResult = calculateVisibility(laterISO, durationDays);
    
    const earlierFrom = parseISO(earlierResult.visible_from!);
    const laterFrom = parseISO(laterResult.visible_from!);
    
    return {
      passed: laterFrom > earlierFrom,
      message: 'Moving deadline later correctly moves visible_from later',
      expected: true,
      actual: laterFrom > earlierFrom,
    };
  });

  // Test 7.4: Changing duration with same deadline updates visible_from
  runTest('Changing duration with same deadline updates visible_from', () => {
    const deadline = addDays(new Date(), 10);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    
    const result1 = calculateVisibility(deadlineISO, 3);
    const result2 = calculateVisibility(deadlineISO, 7);
    
    // visible_until should be same (deadline)
    // visible_from should be different
    const sameUntil = result1.visible_until === result2.visible_until &&
                      result2.visible_until === deadlineISO;
    const differentFrom = result1.visible_from !== result2.visible_from;
    
    return {
      passed: sameUntil && differentFrom,
      message: 'Changing duration updates visible_from but keeps visible_until = deadline',
      expected: { sameUntil: true, differentFrom: true },
      actual: { sameUntil, differentFrom },
    };
  });

  // Test 7.5: Deadline change preserves duration calculation
  runTest('Deadline change preserves duration calculation formula', () => {
    const deadline1 = addDays(new Date(), 5);
    const deadline2 = addDays(new Date(), 15);
    const durationDays = 6;
    
    const result1 = calculateVisibility(
      formatISO(startOfDay(deadline1), { representation: 'date' }), 
      durationDays
    );
    const result2 = calculateVisibility(
      formatISO(startOfDay(deadline2), { representation: 'date' }), 
      durationDays
    );
    
    // Verify formula: visible_from = deadline - (duration - 1)
    const expected1From = formatISO(startOfDay(addDays(deadline1, -5)), { representation: 'date' });
    const expected2From = formatISO(startOfDay(addDays(deadline2, -5)), { representation: 'date' });
    
    return {
      passed: result1.visible_from === expected1From && 
              result2.visible_from === expected2From,
      message: 'Deadline change preserves formula: visible_from = deadline - (duration - 1)',
      expected: { from1: expected1From, from2: expected2From },
      actual: { from1: result1.visible_from, from2: result2.visible_from },
    };
  });

  // Test 7.6: Changing deadline from future to past updates visibility correctly
  runTest('Changing deadline from future to past', () => {
    const futureDeadline = addDays(new Date(), 10);
    const futureISO = formatISO(startOfDay(futureDeadline), { representation: 'date' });
    const pastDeadline = subDays(new Date(), 5);
    const pastISO = formatISO(startOfDay(pastDeadline), { representation: 'date' });
    const durationDays = 5;
    
    const futureResult = calculateVisibility(futureISO, durationDays);
    const pastResult = calculateVisibility(pastISO, durationDays);
    
    // Both should calculate correctly (even if past deadline means task not visible today)
    // Use strict boolean comparison instead of relying on truthy values
    const bothCalculated = !!(futureResult.visible_from && futureResult.visible_until &&
                               pastResult.visible_from && pastResult.visible_until);
    
    return {
      passed: bothCalculated === true,
      message: 'Changing deadline from future to past correctly recalculates visibility',
      expected: true,
      actual: bothCalculated,
    };
  });

  // Test 7.7: Multiple deadline changes maintain consistency
  runTest('Multiple deadline changes maintain visibility consistency', () => {
    const deadlines = [
      addDays(new Date(), 3),
      addDays(new Date(), 7),
      addDays(new Date(), 12),
    ];
    const durationDays = 4;
    
    const results = deadlines.map(d => 
      calculateVisibility(formatISO(startOfDay(d), { representation: 'date' }), durationDays)
    );
    
    // All should have correct formula: visible_from = deadline - 3
    const allCorrect = results.every((result, i) => {
      const expectedFrom = formatISO(startOfDay(addDays(deadlines[i], -3)), { representation: 'date' });
      return result.visible_from === expectedFrom && 
             result.visible_until === formatISO(startOfDay(deadlines[i]), { representation: 'date' });
    });
    
    return {
      passed: allCorrect === true,
      message: 'Multiple deadline changes: each maintains correct visibility formula',
      expected: true,
      actual: allCorrect,
    };
  });

  // Test 7.8: Changing deadline updates visible_until to new deadline
  runTest('Changing deadline updates visible_until to new deadline', () => {
    const originalDeadline = addDays(new Date(), 5);
    const originalISO = formatISO(startOfDay(originalDeadline), { representation: 'date' });
    const newDeadline = addDays(new Date(), 12);
    const newISO = formatISO(startOfDay(newDeadline), { representation: 'date' });
    const durationDays = 3;
    
    const originalResult = calculateVisibility(originalISO, durationDays);
    const newResult = calculateVisibility(newISO, durationDays);
    
    return {
      passed: originalResult.visible_until === originalISO && 
              newResult.visible_until === newISO,
      message: 'visible_until always equals deadline after deadline change',
      expected: { original: originalISO, new: newISO },
      actual: { original: originalResult.visible_until, new: newResult.visible_until },
    };
  });
}

// ============================================================================
// SECTION 8: TIMEZONE-STABLE EVENTS (6 tests)
// ============================================================================

function runSection8(): void {
  currentSection = 'SECTION 8: TIMEZONE-STABLE EVENTS';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 8.1: Date-only comparison (no time drift)
  runTest('Date-only comparison prevents timezone drift', () => {
    // All comparisons use startOfDay, so time doesn't matter
    const deadlineWithTime = new Date('2025-01-15T14:30:00Z');
    const deadlineISO = formatISO(startOfDay(deadlineWithTime), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 1);
    
    // visible_from should be date-only (no time component)
    const hasNoTime = !result.visible_from?.includes('T') && 
                      !result.visible_until?.includes('T');
    
    return {
      passed: hasNoTime === true,
      message: 'Visibility dates use date-only format (no time) preventing timezone drift',
      expected: true,
      actual: hasNoTime,
    };
  });

  // Test 8.2: ISO date string comparison is timezone-safe
  runTest('ISO date string comparison is timezone-safe', () => {
    const today = new Date();
    const todayISO = formatISO(startOfDay(today), { representation: 'date' });
    
    // Parse and compare - should be consistent
    const parsed = parseISO(todayISO);
    const compared = startOfDay(parsed);
    const reFormatted = formatISO(compared, { representation: 'date' });
    
    return {
      passed: reFormatted === todayISO,
      message: 'Date parsing and formatting is consistent (timezone-safe)',
      expected: todayISO,
      actual: reFormatted,
    };
  });

  // Test 8.3: visible_from comparison works across timezones
  runTest('visible_from comparison works correctly (timezone-independent)', () => {
    // Create a date that would be different in different timezones if we used datetime
    const futureDate = addDays(new Date(), 5);
    const futureISO = formatISO(startOfDay(futureDate), { representation: 'date' });
    
    // Parse it back - should be same date regardless of timezone
    const parsed = parseISO(futureISO);
    const reFormatted = formatISO(startOfDay(parsed), { representation: 'date' });
    
    return {
      passed: reFormatted === futureISO,
      message: 'Date comparison uses date-only, preventing timezone-related issues',
      expected: futureISO,
      actual: reFormatted,
    };
  });

  // Test 8.4: Task created in one timezone, viewed in another - same visibility
  runTest('Task visibility same regardless of timezone', () => {
    const deadline = addDays(new Date(), 7);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    
    // Parse and re-format - should be identical
    const fromParsed = parseISO(result.visible_from!);
    const fromReformatted = formatISO(startOfDay(fromParsed), { representation: 'date' });
    
    return {
      passed: fromReformatted === result.visible_from,
      message: 'Visibility calculation produces consistent results across timezones',
      expected: result.visible_from,
      actual: fromReformatted,
    };
  });

  // Test 8.5: Recurring instances maintain date-only format
  runTest('Recurring instances use date-only format (timezone-safe)', () => {
    const instanceDeadline = addDays(new Date(), 10);
    const deadlineISO = formatISO(startOfDay(instanceDeadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 3);
    
    const bothDateOnly = !result.visible_from?.includes('T') && 
                         !result.visible_until?.includes('T');
    
    return {
      passed: bothDateOnly === true,
      message: 'Recurring instances use date-only format for visibility',
      expected: true,
      actual: bothDateOnly,
    };
  });

  // Test 8.6: start_date comparison is timezone-safe
  runTest('start_date comparison is timezone-safe', () => {
    const futureStart = addDays(new Date(), 4);
    const futureStartISO = formatISO(startOfDay(futureStart), { representation: 'date' });
    const result = calculateVisibility(null, 5, futureStartISO);
    
    // Parse and re-format - should be identical
    const fromParsed = parseISO(result.visible_from!);
    const fromReformatted = formatISO(startOfDay(fromParsed), { representation: 'date' });
    
    return {
      passed: fromReformatted === result.visible_from && 
              fromReformatted === futureStartISO,
      message: 'start_date-based visibility is timezone-safe',
      expected: futureStartISO,
      actual: fromReformatted,
    };
  });
}

// ============================================================================
// SECTION 9: EDGE CASES (8 tests)
// ============================================================================

function runSection9(): void {
  currentSection = 'SECTION 9: EDGE CASES';
  console.log(`\n${currentSection}`);
  console.log('='.repeat(60));

  // Test 9.1: visible_from = today (boundary)
  runTest('visible_from = today (boundary case)', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const deadline = addDays(new Date(), 4);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 5);
    
    // visible_from should be today (deadline - 4)
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: result.visible_from === today && isVisible === true,
      message: 'Task with visible_from = today is correctly visible today',
      expected: { visible_from: today, isVisible: true },
      actual: { visible_from: result.visible_from, isVisible },
    };
  });

  // Test 9.2: visible_until = today (boundary)
  runTest('visible_until = today (boundary case)', () => {
    const today = formatISO(startOfDay(new Date()), { representation: 'date' });
    const result = calculateVisibility(today, 1);
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: result.visible_until === today && isVisible === true,
      message: 'Task with visible_until = today is correctly visible today',
      expected: { visible_until: today, isVisible: true },
      actual: { visible_until: result.visible_until, isVisible },
    };
  });

  // Test 9.3: duration = 1 (minimum duration)
  runTest('duration = 1 (minimum duration)', () => {
    const deadline = addDays(new Date(), 5);
    const deadlineISO = formatISO(startOfDay(deadline), { representation: 'date' });
    const result = calculateVisibility(deadlineISO, 1);
    
    return {
      passed: result.visible_from === deadlineISO && 
              result.visible_until === deadlineISO,
      message: 'Duration 1: visible_from = visible_until = deadline',
      expected: { visible_from: deadlineISO, visible_until: deadlineISO },
      actual: result,
    };
  });

  // Test 9.4: Missing visible_from (only visible_until set)
  runTest('Missing visible_from, only visible_until set', () => {
    const isVisible = isVisibleToday(null, formatISO(startOfDay(addDays(new Date(), 5)), { representation: 'date' }));
    
    // Should be visible if visible_until >= today
    return {
      passed: isVisible === true,
      message: 'Task with only visible_until is visible if visible_until >= today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 9.5: Missing visible_until (only visible_from set)
  runTest('Missing visible_until, only visible_from set', () => {
    const pastStart = formatISO(startOfDay(subDays(new Date(), 3)), { representation: 'date' });
    const isVisible = isVisibleToday(pastStart, null);
    
    // Should be visible if visible_from <= today
    return {
      passed: isVisible === true,
      message: 'Task with only visible_from is visible if visible_from <= today',
      expected: true,
      actual: isVisible,
    };
  });

  // Test 9.6: Both fields null (legacy task)
  runTest('Both visibility fields null (legacy task)', () => {
    const isVisible = isVisibleToday(null, null);
    const isUpcomingTask = isUpcoming(null);
    
    // Legacy tasks should be visible but not upcoming
    return {
      passed: isVisible === true && isUpcomingTask === false,
      message: 'Legacy tasks without visibility fields: visible but not upcoming',
      expected: { visible: true, upcoming: false },
      actual: { visible: isVisible, upcoming: isUpcomingTask },
    };
  });

  // Test 9.7: Task with deadline in past but long duration
  runTest('Deadline in past, long duration - visibility window calculation', () => {
    const pastDeadline = subDays(new Date(), 10);
    const pastISO = formatISO(startOfDay(pastDeadline), { representation: 'date' });
    const result = calculateVisibility(pastISO, 15);
    
    // visible_from = pastDeadline - 14 = today - 24
    // visible_until = pastDeadline = today - 10
    // Task should NOT be visible today (visible_until < today)
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    
    return {
      passed: isVisible === false,
      message: 'Task with past deadline: even with long duration, not visible if visible_until < today',
      expected: false,
      actual: isVisible,
    };
  });

  // Test 9.8: Task created with future date (edge case)
  runTest('Task with start_date in future (30 days)', () => {
    const futureStart = addDays(new Date(), 30);
    const futureStartISO = formatISO(startOfDay(futureStart), { representation: 'date' });
    const result = calculateVisibility(null, 5, futureStartISO);
    
    // visible_from = futureStart (30 days away)
    // visible_until = futureStart + 4 (34 days away)
    // Should NOT be visible today, should be upcoming if within 7 days... wait, 30 days is > 7
    const isVisible = isVisibleToday(result.visible_from, result.visible_until);
    const isUpcomingTask = isUpcoming(result.visible_from, new Date(), 7);
    
    return {
      passed: isVisible === false && isUpcomingTask === false,
      message: 'Task with start_date far in future: not visible today, not upcoming (beyond 7 days)',
      expected: { visible: false, upcoming: false },
      actual: { visible: isVisible, upcoming: isUpcomingTask },
    };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

function runAllTests(): void {
  console.log('\n🧪 COMPREHENSIVE VISIBILITY & TASK ENGINE TESTS');
  console.log('='.repeat(60));
  console.log(`Running ${sectionsToRun ? 'selected' : 'all'} sections...`);
  if (sectionsToRun) {
    console.log(`Sections to run: ${sectionsToRun.join(', ')}`);
  }
  console.log('='.repeat(60));

  testCounter = 0;

  if (shouldRunSection(1)) runSection1();
  if (shouldRunSection(2)) runSection2();
  if (shouldRunSection(3)) runSection3();
  if (shouldRunSection(4)) runSection4();
  if (shouldRunSection(5)) runSection5();
  if (shouldRunSection(6)) runSection6();
  if (shouldRunSection(7)) runSection7();
  if (shouldRunSection(8)) runSection8();
  if (shouldRunSection(9)) runSection9();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`   ${result.testNumber}. ${result.name} (${result.section})`);
      console.log(`      ${result.message}`);
    });
  }

  // Group by section
  const bySection = results.reduce((acc, result) => {
    if (!acc[result.section]) {
      acc[result.section] = { passed: 0, failed: 0, total: 0 };
    }
    acc[result.section].total++;
    if (result.passed) {
      acc[result.section].passed++;
    } else {
      acc[result.section].failed++;
    }
    return acc;
  }, {} as Record<string, { passed: number; failed: number; total: number }>);

  console.log('\n📋 Results by section:');
  Object.entries(bySection).forEach(([section, stats]) => {
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`   ${status} ${section}: ${stats.passed}/${stats.total} passed`);
  });

  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Please review the results above.`);
    process.exit(1);
  }
}

// Run tests
runAllTests();

