/**
 * Comprehensive Recurring Task Edge Case Test Suite
 * Tests all edge cases for recurring task generation
 * 
 * DO NOT RUN THIS DIRECTLY - This is a reference script for manual testing
 * Run tests via Desktop app UI and verify results
 */

import { Task, RecurringOptions } from '@mydailyops/core';

// ============================================
// TEST DATA DEFINITIONS
// ============================================

interface TestCase {
  id: string;
  name: string;
  type: RecurringOptions['type'];
  config: Partial<RecurringOptions>;
  expectedBehavior: string;
  expectedCount?: number;
  expectedDates?: string[];
  shouldSkip?: string[];
}

const testCases: TestCase[] = [
  // ============================================
  // TEST GROUP 1 - MONTHLY (DATE)
  // ============================================
  {
    id: 'monthly-31',
    name: 'Monthly - Day 31 (3 months ahead)',
    type: 'monthly_date',
    config: {
      dayOfMonth: 31,
      generate_unit: 'months',
      generate_value: 3,
    },
    expectedBehavior: 'Should generate for months with 31 days, skip Feb/Apr/Jun (30 days)',
    expectedDates: [], // Will be filled during test
    shouldSkip: ['February', 'April', 'June'],
  },
  {
    id: 'monthly-30',
    name: 'Monthly - Day 30 (3 months ahead)',
    type: 'monthly_date',
    config: {
      dayOfMonth: 30,
      generate_unit: 'months',
      generate_value: 3,
    },
    expectedBehavior: 'Should skip February (only 28/29 days)',
    shouldSkip: ['February'],
  },
  {
    id: 'monthly-29',
    name: 'Monthly - Day 29 (6 months ahead)',
    type: 'monthly_date',
    config: {
      dayOfMonth: 29,
      generate_unit: 'months',
      generate_value: 6,
    },
    expectedBehavior: 'Should generate for all months except February in non-leap years',
    shouldSkip: ['February'], // In non-leap years
  },
  {
    id: 'monthly-28',
    name: 'Monthly - Day 28',
    type: 'monthly_date',
    config: {
      dayOfMonth: 28,
      generate_unit: 'months',
      generate_value: 3,
    },
    expectedBehavior: 'Should always generate for February and all other months',
    shouldSkip: [],
  },

  // ============================================
  // TEST GROUP 2 - MONTHLY (WEEKDAY)
  // ============================================
  {
    id: 'monthly-weekday-1st-monday',
    name: 'Monthly - 1st Monday (4 months)',
    type: 'monthly_weekday',
    config: {
      weekdays: ['mon'],
      weekNumber: 1,
      generate_unit: 'months',
      generate_value: 4,
    },
    expectedBehavior: 'Should generate 1st Monday of each month for 4 months',
    expectedCount: 4,
  },
  {
    id: 'monthly-weekday-last-friday',
    name: 'Monthly - Last Friday (4 months)',
    type: 'monthly_weekday',
    config: {
      weekdays: ['fri'],
      weekNumber: -1, // Last
      generate_unit: 'months',
      generate_value: 4,
    },
    expectedBehavior: 'Should generate last Friday of each month, especially test Feb/Apr/Jun',
    expectedCount: 4,
  },
  {
    id: 'monthly-weekday-5th-monday',
    name: 'Monthly - 5th Monday (4-6 months)',
    type: 'monthly_weekday',
    config: {
      weekdays: ['mon'],
      weekNumber: 5,
      generate_unit: 'months',
      generate_value: 6,
    },
    expectedBehavior: 'Should ONLY generate in months that actually have 5 Mondays, skip others',
  },

  // ============================================
  // TEST GROUP 3 - WEEKLY
  // ============================================
  {
    id: 'weekly-tue-fri',
    name: 'Weekly - Tuesday + Friday (4 weeks)',
    type: 'weekly',
    config: {
      weekdays: ['tue', 'fri'],
      generate_unit: 'weeks',
      generate_value: 4,
    },
    expectedBehavior: 'Should generate exactly 8 tasks (2 per week × 4 weeks)',
    expectedCount: 8,
  },

  // ============================================
  // TEST GROUP 4 - INTERVAL
  // ============================================
  {
    id: 'interval-3days',
    name: 'Interval - Every 3 days (9 days ahead)',
    type: 'interval',
    config: {
      interval_days: 3,
      generate_unit: 'days',
      generate_value: 9,
    },
    expectedBehavior: 'Should generate exactly 3 tasks (every 3 days within 9 days)',
    expectedCount: 3,
  },

  // ============================================
  // TEST GROUP 5 - DAILY
  // ============================================
  {
    id: 'daily-7days',
    name: 'Daily - 7 days',
    type: 'daily',
    config: {
      generate_unit: 'days',
      generate_value: 7,
    },
    expectedBehavior: 'Should generate exactly 7 tasks, one per day',
    expectedCount: 7,
  },
];

// ============================================
// TEST RESULT STRUCTURE
// ============================================

interface TestResult {
  testId: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  expectedBehavior: string;
  actualResults: {
    generatedCount: number;
    expectedCount?: number;
    generatedDates: string[];
    expectedDates?: string[];
    skippedMonths?: string[];
    actualSkippedMonths?: string[];
  };
  issues: string[];
  notes: string[];
}

const testResults: TestResult[] = [];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

function getMonthName(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'long' });
}

function checkIfLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function countWeekdaysInMonth(year: number, month: number, weekday: number): number {
  // 0 = Sunday, 1 = Monday, etc.
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  
  let count = 0;
  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === weekday) {
      count++;
    }
  }
  return count;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateMonthlyDate(testCase: TestCase, generatedDates: string[]): TestResult {
  const result: TestResult = {
    testId: testCase.id,
    testName: testCase.name,
    status: 'PASS',
    expectedBehavior: testCase.expectedBehavior,
    actualResults: {
      generatedCount: generatedDates.length,
      generatedDates: generatedDates.map(formatDate),
    },
    issues: [],
    notes: [],
  };

  const dayOfMonth = testCase.config.dayOfMonth!;
  const monthsToCheck = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
  const actualSkipped: string[] = [];

  // Check each expected month
  for (const month of monthsToCheck) {
    const monthDates = generatedDates.filter(d => getMonthName(d) === month);
    
    if (testCase.shouldSkip?.includes(month)) {
      if (monthDates.length > 0) {
        result.issues.push(`Expected ${month} to be skipped, but found ${monthDates.length} instances`);
        result.status = 'FAIL';
        actualSkipped.push(month);
      }
    } else {
      if (monthDates.length === 0) {
        result.issues.push(`Expected ${month} to generate an instance, but none found`);
        result.status = 'FAIL';
      } else if (monthDates.length > 1) {
        result.issues.push(`Expected 1 instance for ${month}, but found ${monthDates.length}`);
        result.status = 'FAIL';
      } else {
        // Verify the day is correct (or last day of month if dayOfMonth > last day)
        const date = new Date(monthDates[0]);
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const expectedDay = Math.min(dayOfMonth, lastDayOfMonth);
        
        if (date.getDate() !== expectedDay) {
          result.issues.push(`Expected day ${expectedDay} for ${month}, but got ${date.getDate()}`);
          result.status = 'FAIL';
        }
      }
    }
  }

  result.actualResults.actualSkippedMonths = actualSkipped;
  return result;
}

function validateMonthlyWeekday(testCase: TestCase, generatedDates: string[]): TestResult {
  const result: TestResult = {
    testId: testCase.id,
    testName: testCase.name,
    status: 'PASS',
    expectedBehavior: testCase.expectedBehavior,
    actualResults: {
      generatedCount: generatedDates.length,
      generatedDates: generatedDates.map(formatDate),
    },
    issues: [],
    notes: [],
  };

  const weekNumber = testCase.config.weekNumber!;
  const weekday = testCase.config.weekdays![0];
  const weekdayMap: Record<string, number> = {
    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
  };
  const targetWeekday = weekdayMap[weekday];

  // For 5th weekday test, verify only months with 5 occurrences
  if (weekNumber === 5) {
    const monthsByDate = new Map<string, string[]>();
    generatedDates.forEach(d => {
      const month = getMonthName(d);
      if (!monthsByDate.has(month)) {
        monthsByDate.set(month, []);
      }
      monthsByDate.get(month)!.push(d);
    });

    for (const [month, dates] of monthsByDate.entries()) {
      const firstDate = new Date(dates[0]);
      const actualCount = countWeekdaysInMonth(
        firstDate.getFullYear(),
        firstDate.getMonth(),
        targetWeekday
      );

      if (actualCount < 5) {
        result.issues.push(`Month ${month} has only ${actualCount} ${weekday}s, but generated instance`);
        result.status = 'FAIL';
      }
    }
  }

  // Check expected count
  if (testCase.expectedCount && generatedDates.length !== testCase.expectedCount) {
    result.issues.push(`Expected ${testCase.expectedCount} instances, but got ${generatedDates.length}`);
    result.status = 'FAIL';
  }

  return result;
}

function validateWeekly(testCase: TestCase, generatedDates: string[]): TestResult {
  const result: TestResult = {
    testId: testCase.id,
    testName: testCase.name,
    status: 'PASS',
    expectedBehavior: testCase.expectedBehavior,
    actualResults: {
      generatedCount: generatedDates.length,
      generatedDates: generatedDates.map(formatDate),
    },
    issues: [],
    notes: [],
  };

  if (testCase.expectedCount && generatedDates.length !== testCase.expectedCount) {
    result.issues.push(`Expected ${testCase.expectedCount} instances, but got ${generatedDates.length}`);
    result.status = 'FAIL';
  }

  // Verify weekdays are correct
  const expectedWeekdays = testCase.config.weekdays || [];
  const weekdayMap: Record<string, number> = {
    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
  };
  const expectedDayNumbers = new Set(expectedWeekdays.map(w => weekdayMap[w]));

  for (const dateStr of generatedDates) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    if (!expectedDayNumbers.has(dayOfWeek)) {
      result.issues.push(`Date ${formatDate(dateStr)} has wrong weekday (${dayOfWeek})`);
      result.status = 'FAIL';
    }
  }

  // Check for duplicates
  const uniqueDates = new Set(generatedDates.map(formatDate));
  if (uniqueDates.size !== generatedDates.length) {
    result.issues.push(`Found duplicate dates`);
    result.status = 'FAIL';
  }

  return result;
}

function validateInterval(testCase: TestCase, generatedDates: string[]): TestResult {
  const result: TestResult = {
    testId: testCase.id,
    testName: testCase.name,
    status: 'PASS',
    expectedBehavior: testCase.expectedBehavior,
    actualResults: {
      generatedCount: generatedDates.length,
      generatedDates: generatedDates.map(formatDate),
    },
    issues: [],
    notes: [],
  };

  if (testCase.expectedCount && generatedDates.length !== testCase.expectedCount) {
    result.issues.push(`Expected ${testCase.expectedCount} instances, but got ${generatedDates.length}`);
    result.status = 'FAIL';
  }

  const intervalDays = testCase.config.interval_days || 1;
  const sortedDates = generatedDates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());

  for (let i = 1; i < sortedDates.length; i++) {
    const diffDays = Math.round((sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== intervalDays) {
      result.issues.push(`Interval mismatch: ${diffDays} days between ${formatDate(sortedDates[i-1])} and ${formatDate(sortedDates[i])}, expected ${intervalDays}`);
      result.status = 'FAIL';
    }
  }

  return result;
}

function validateDaily(testCase: TestCase, generatedDates: string[]): TestResult {
  const result: TestResult = {
    testId: testCase.id,
    testName: testCase.name,
    status: 'PASS',
    expectedBehavior: testCase.expectedBehavior,
    actualResults: {
      generatedCount: generatedDates.length,
      generatedDates: generatedDates.map(formatDate),
    },
    issues: [],
    notes: [],
  };

  if (testCase.expectedCount && generatedDates.length !== testCase.expectedCount) {
    result.issues.push(`Expected ${testCase.expectedCount} instances, but got ${generatedDates.length}`);
    result.status = 'FAIL';
  }

  // Check for gaps
  const sortedDates = generatedDates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  for (let i = 1; i < sortedDates.length; i++) {
    const diffDays = Math.round((sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 1) {
      result.issues.push(`Gap found: ${diffDays} days between ${formatDate(sortedDates[i-1])} and ${formatDate(sortedDates[i])}`);
      result.status = 'FAIL';
    }
  }

  return result;
}

// ============================================
// TEST EXECUTION LOGIC
// ============================================

/**
 * This script provides test case definitions and validation logic.
 * 
 * TO EXECUTE TESTS:
 * 1. Start Desktop app: pnpm --filter @mydailyops/desktop tauri dev
 * 2. Log into account
 * 3. Clear all existing tasks
 * 4. For each test case:
 *    - Create task with specified recurring config
 *    - Collect generated instance dates from database
 *    - Run validation function
 *    - Record results
 * 5. Generate final report
 * 
 * NOTE: This cannot be fully automated without UI interaction.
 * Use browser DevTools console or database queries to verify.
 */

export {
  testCases,
  TestResult,
  validateMonthlyDate,
  validateMonthlyWeekday,
  validateWeekly,
  validateInterval,
  validateDaily,
  formatDate,
  getMonthName,
};

