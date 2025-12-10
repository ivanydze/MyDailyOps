/**
 * Automated Recurring Task Edge Case Test Suite
 * Tests recurring generation logic programmatically
 * 
 * Usage: npx tsx test-recurring-automated.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import date-fns functions needed for date calculations
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  getDay,
  getDate,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  isAfter,
  isEqual,
  startOfDay,
  isBefore,
  format,
} from 'date-fns';

// ============================================
// TYPE DEFINITIONS (from @mydailyops/core)
// ============================================

type RecurringOptionsType =
  | "none"
  | "daily"
  | "interval"
  | "weekly"
  | "monthly_date"
  | "monthly_weekday";

interface RecurringOptions {
  type: RecurringOptionsType;
  interval_days?: number;
  weekdays?: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[];
  dayOfMonth?: number;
  weekNumber?: number;
  generate_unit?: "days" | "weeks" | "months";
  generate_value?: number;
  custom?: boolean;
}

interface Task {
  id: string;
  title: string;
  deadline?: string;
  recurring_options: RecurringOptions | null;
  [key: string]: any;
}

// ============================================
// COPIED FUNCTIONS FROM recurring.ts (for testing)
// ============================================

function weekdayToDayOfWeek(weekday: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'): number {
  const map: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };
  return map[weekday];
}

function countWeekdaysInMonthForTest(year: number, month: number, weekday: number): number {
  const lastDate = getDate(endOfMonth(new Date(year, month, 1)));
  let count = 0;
  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === weekday) {
      count++;
    }
  }
  return count;
}

function getNthWeekdayInMonth(
  year: number,
  month: number,
  weekday: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
  weekNumber: number
): Date | null {
  const dayOfWeek = weekdayToDayOfWeek(weekday);
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  
  let offset = (dayOfWeek - firstWeekday + 7) % 7;
  
  if (weekNumber === -1) {
    const lastOfMonth = endOfMonth(firstOfMonth);
    const lastWeekday = lastOfMonth.getDay();
    const lastOffset = (lastWeekday - dayOfWeek + 7) % 7;
    const lastDate = new Date(year, month, getDate(lastOfMonth) - lastOffset);
    return lastDate;
  } else {
    // Validate that the Nth occurrence exists
    const actualCount = countWeekdaysInMonthForTest(year, month, dayOfWeek);
    if (weekNumber > actualCount) {
      return null; // Nth occurrence doesn't exist
    }
    
    const targetDate = new Date(year, month, 1 + offset + (weekNumber - 1) * 7);
    const endDate = endOfMonth(firstOfMonth);
    if (targetDate > endDate) {
      return null;
    }
    return targetDate;
  }
}

function computeWeeklyDatesInRange(
  templateTask: Task,
  startDate: Date,
  endDate: Date
): Date[] {
  const options = templateTask.recurring_options;
  if (!options || options.type !== 'weekly' || !options.weekdays || options.weekdays.length === 0) {
    return [];
  }

  let originalTime: { hours: number; minutes: number; seconds: number } | null = null;
  if (templateTask.deadline) {
    const deadlineDate = parseISO(templateTask.deadline);
    originalTime = {
      hours: deadlineDate.getHours(),
      minutes: deadlineDate.getMinutes(),
      seconds: deadlineDate.getSeconds(),
    };
  }

  const dates: Date[] = [];
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const now = startOfDay(new Date());
  
  const targetDayNumbers = new Set<number>();
  for (const weekday of options.weekdays) {
    targetDayNumbers.add(weekdayToDayOfWeek(weekday));
  }

  let currentDate = addDays(start, 1);
  
  while (isBefore(currentDate, end) || isEqual(startOfDay(currentDate), end)) {
    const dayOfWeek = getDay(currentDate);
    const currentDayStart = startOfDay(currentDate);
    
    if (targetDayNumbers.has(dayOfWeek) && (isAfter(currentDayStart, now) || isEqual(currentDayStart, now))) {
      let dateWithTime = new Date(currentDate);
      
      if (originalTime) {
        dateWithTime = setHours(dateWithTime, originalTime.hours);
        dateWithTime = setMinutes(dateWithTime, originalTime.minutes);
        dateWithTime = setSeconds(dateWithTime, originalTime.seconds);
      }
      
      dates.push(dateWithTime);
    }
    
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function computeNextNDates(templateTask: Task, count: number): Date[] {
  const options = templateTask.recurring_options;
  if (!options || options.type === 'none') {
    return [];
  }

  const startDate = templateTask.deadline ? parseISO(templateTask.deadline) : new Date();
  
  let originalTime: { hours: number; minutes: number; seconds: number } | null = null;
  if (templateTask.deadline) {
    const deadlineDate = parseISO(templateTask.deadline);
    originalTime = {
      hours: deadlineDate.getHours(),
      minutes: deadlineDate.getMinutes(),
      seconds: deadlineDate.getSeconds(),
    };
  }

  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    let nextDate: Date | null = null;

    switch (options.type) {
      case 'daily': {
        currentDate = addDays(currentDate, 1);
        nextDate = new Date(currentDate);
        break;
      }

      case 'interval': {
        const intervalDays = options.interval_days || 1;
        currentDate = addDays(currentDate, intervalDays);
        nextDate = new Date(currentDate);
        break;
      }

      case 'weekly': {
        break;
      }

      case 'monthly_date': {
        if (!options.dayOfMonth) {
          break;
        }
        currentDate = addMonths(currentDate, 1);
        const targetDay = Math.min(options.dayOfMonth, getDate(endOfMonth(currentDate)));
        nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
        currentDate = new Date(nextDate);
        break;
      }

      case 'monthly_weekday': {
        if (!options.weekdays || options.weekdays.length === 0 || options.weekNumber === undefined) {
          break;
        }
        const weekday = options.weekdays[0];
        currentDate = addMonths(currentDate, 1);
        
        // Keep searching until we find a valid date (skip months where Nth occurrence doesn't exist)
        let candidate: Date | null = null;
        let attempts = 0;
        const maxAttempts = 12;
        
        while (!candidate && attempts < maxAttempts) {
          candidate = getNthWeekdayInMonth(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            weekday,
            options.weekNumber
          );
          
          if (!candidate) {
            currentDate = addMonths(currentDate, 1);
            attempts++;
            continue;
          }
          
          if (!isAfter(candidate, startDate) || isEqual(candidate, startDate)) {
            currentDate = addMonths(currentDate, 1);
            candidate = null;
            attempts++;
            continue;
          }
          
          break;
        }

        if (candidate) {
          nextDate = candidate;
          currentDate = new Date(nextDate);
        }
        break;
      }

      default:
        return dates;
    }

    if (originalTime && nextDate) {
      nextDate = setHours(nextDate, originalTime.hours);
      nextDate = setMinutes(nextDate, originalTime.minutes);
      nextDate = setSeconds(nextDate, originalTime.seconds);
    }

    if (nextDate) {
      dates.push(nextDate);
    } else {
      break;
    }
  }

  return dates;
}

function getDefaultGenerationConfig(type: RecurringOptionsType): { unit: 'days' | 'weeks' | 'months'; value: number } {
  switch (type) {
    case 'daily': return { unit: 'days', value: 7 };
    case 'weekly': return { unit: 'weeks', value: 4 };
    case 'monthly_date':
    case 'monthly_weekday': return { unit: 'months', value: 3 };
    case 'interval': return { unit: 'days', value: 7 };
    default: return { unit: 'days', value: 7 };
  }
}

function calculateInstanceCount(options: RecurringOptions): number {
  const unit = options.generate_unit || 'days';
  const value = options.generate_value || 7;
  
  switch (options.type) {
    case 'daily':
      if (unit === 'days') return value;
      if (unit === 'weeks') return value * 7;
      if (unit === 'months') return value * 30;
      return 7;
    
    case 'weekly':
      if (unit === 'weeks') return value;
      if (unit === 'days') return Math.ceil(value / 7);
      if (unit === 'months') return value * 4;
      return 4;
    
    case 'monthly_date':
    case 'monthly_weekday':
      if (unit === 'months') return value;
      if (unit === 'days') return Math.ceil(value / 30);
      if (unit === 'weeks') return Math.ceil(value / 4);
      return 3;
    
    case 'interval':
      const intervalDays = options.interval_days || 1;
      if (unit === 'days') {
        return Math.floor(value / intervalDays);
      } else if (unit === 'weeks') {
        const daysInRange = value * 7;
        return Math.floor(daysInRange / intervalDays);
      } else if (unit === 'months') {
        const daysInRange = value * 30;
        return Math.floor(daysInRange / intervalDays);
      }
      return value;
    
    default:
      return 7;
  }
}

// ============================================
// TEST RESULTS
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
    monthsGenerated: string[];
    monthsSkipped: string[];
  };
  issues: string[];
  notes: string[];
}

const results: TestResult[] = [];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getMonthName(date: Date): string {
  return format(date, 'MMMM');
}

function countWeekdaysInMonth(year: number, month: number, weekday: number): number {
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
// TEST EXECUTION
// ============================================

function runTest1_Monthly31(): TestResult {
  console.log('\n🔍 Running Test 1.1: Monthly - Day 31 (3 months ahead)');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-1',
    title: 'Test Monthly Day 31',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_date',
      dayOfMonth: 31,
      generate_unit: 'months',
      generate_value: 3,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);
  const months = dates.map(getMonthName);
  const uniqueMonths = [...new Set(months)];

  const result: TestResult = {
    testId: 'monthly-31',
    testName: 'Monthly - Day 31 (3 months ahead)',
    status: 'PASS',
    expectedBehavior: 'Should generate on day 31 for months with 31 days, or last day of month for shorter months (INTENTIONAL BEHAVIOR)',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 3,
      generatedDates: dateStrings,
      monthsGenerated: uniqueMonths,
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  // INTENTIONAL BEHAVIOR: Day 31 uses last available day of month, does NOT skip months
  // Check if dates are correct (should be 31st or last day of month)
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const month = getMonthName(date);
    const dayOfMonth = date.getDate();
    const lastDay = getDate(endOfMonth(date));

    // Should be either 31 (if month has 31 days) or last day of month (if shorter)
    if (dayOfMonth !== 31 && dayOfMonth !== lastDay) {
      result.status = 'FAIL';
      result.issues.push(`${month} generated on day ${dayOfMonth}, expected 31 or ${lastDay} (last day)`);
    } else {
      result.notes.push(`${month} generated on day ${dayOfMonth} (correct - using last available day)`);
    }
  }

  if (dates.length !== 3) {
    result.status = 'FAIL';
    result.issues.push(`Expected 3 instances, got ${dates.length}`);
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  console.log(`  📅 Months: ${uniqueMonths.join(', ')}`);
  console.log(`  ✅ Behavior: Using last available day of month (intentional)`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest2_Monthly30(): TestResult {
  console.log('\n🔍 Running Test 1.2: Monthly - Day 30 (3 months ahead)');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-2',
    title: 'Test Monthly Day 30',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_date',
      dayOfMonth: 30,
      generate_unit: 'months',
      generate_value: 3,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);
  const months = dates.map(getMonthName);
  const uniqueMonths = [...new Set(months)];

  const result: TestResult = {
    testId: 'monthly-30',
    testName: 'Monthly - Day 30 (3 months ahead)',
    status: 'PASS',
    expectedBehavior: 'Should generate on day 30 for months with 30+ days, or last day of month for February (INTENTIONAL BEHAVIOR)',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 3,
      generatedDates: dateStrings,
      monthsGenerated: uniqueMonths,
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  // INTENTIONAL BEHAVIOR: Day 30 uses last available day of month for February, does NOT skip
  // Check if dates are correct (should be 30 or last day of month)
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const month = getMonthName(date);
    const dayOfMonth = date.getDate();
    const lastDay = getDate(endOfMonth(date));

    // Should be either 30 (if month has 30+ days) or last day of month (for February)
    if (dayOfMonth !== 30 && dayOfMonth !== lastDay) {
      result.status = 'FAIL';
      result.issues.push(`${month} generated on day ${dayOfMonth}, expected 30 or ${lastDay} (last day)`);
    } else {
      if (month === 'February') {
        result.notes.push(`February generated on day ${dayOfMonth} (correct - using last available day, intentional behavior)`);
      }
    }
  }

  if (dates.length !== 3) {
    result.status = 'FAIL';
    result.issues.push(`Expected 3 instances, got ${dates.length}`);
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  console.log(`  ✅ Behavior: Using last available day of month (intentional)`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest3_Monthly29(): TestResult {
  console.log('\n🔍 Running Test 1.3: Monthly - Day 29 (6 months ahead)');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-3',
    title: 'Test Monthly Day 29',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_date',
      dayOfMonth: 29,
      generate_unit: 'months',
      generate_value: 6,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);
  const months = dates.map(getMonthName);

  const result: TestResult = {
    testId: 'monthly-29',
    testName: 'Monthly - Day 29 (6 months ahead)',
    status: 'PASS',
    expectedBehavior: 'Should generate for all months except February in non-leap years',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 6,
      generatedDates: dateStrings,
      monthsGenerated: [...new Set(months)],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  const currentYear = today.getFullYear();
  const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
  
  const febDates = dates.filter(d => getMonthName(d) === 'February');
  if (febDates.length > 0) {
    const febDate = febDates[0];
    const day = febDate.getDate();
    if (!isLeapYear && day === 29) {
      result.status = 'FAIL';
      result.issues.push(`February 29 generated in non-leap year ${currentYear}`);
    } else if (day === 28) {
      result.notes.push(`February generated on 28th (correct for non-leap year)`);
    }
  }

  console.log(`  ✅ Generated ${dates.length} dates`);
  console.log(`  📅 Year: ${currentYear} (leap: ${isLeapYear})`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest4_Monthly28(): TestResult {
  console.log('\n🔍 Running Test 1.4: Monthly - Day 28');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-4',
    title: 'Test Monthly Day 28',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_date',
      dayOfMonth: 28,
      generate_unit: 'months',
      generate_value: 3,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);

  const result: TestResult = {
    testId: 'monthly-28',
    testName: 'Monthly - Day 28',
    status: 'PASS',
    expectedBehavior: 'Should generate for ALL months including February',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 3,
      generatedDates: dates.map(formatDate),
      monthsGenerated: [...new Set(dates.map(getMonthName))],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  const months = dates.map(getMonthName);
  if (!months.includes('February')) {
    result.status = 'FAIL';
    result.issues.push('February should be included but was skipped');
  }

  console.log(`  ✅ Generated ${dates.length} dates`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest5_1stMonday(): TestResult {
  console.log('\n🔍 Running Test 2.1: Monthly - 1st Monday (4 months)');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-5',
    title: 'Test 1st Monday',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_weekday',
      weekdays: ['mon'],
      weekNumber: 1,
      generate_unit: 'months',
      generate_value: 4,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);

  const result: TestResult = {
    testId: 'monthly-weekday-1st-monday',
    testName: 'Monthly - 1st Monday (4 months)',
    status: 'PASS',
    expectedBehavior: 'Should generate 1st Monday of each month for 4 months',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 4,
      generatedDates: dateStrings,
      monthsGenerated: [...new Set(dates.map(getMonthName))],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  // Verify all are Mondays
  for (const date of dates) {
    if (date.getDay() !== 1) {
      result.status = 'FAIL';
      result.issues.push(`${formatDate(date)} is not a Monday (day ${date.getDay()})`);
    }
  }

  // Verify all are 1st Monday (within first 7 days)
  for (const date of dates) {
    if (date.getDate() > 7) {
      result.status = 'FAIL';
      result.issues.push(`${formatDate(date)} is not 1st Monday (day ${date.getDate()})`);
    }
  }

  if (dates.length !== 4) {
    result.status = 'FAIL';
    result.issues.push(`Expected 4 instances, got ${dates.length}`);
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest6_LastFriday(): TestResult {
  console.log('\n🔍 Running Test 2.2: Monthly - Last Friday (4 months)');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-6',
    title: 'Test Last Friday',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_weekday',
      weekdays: ['fri'],
      weekNumber: -1,
      generate_unit: 'months',
      generate_value: 4,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);

  const result: TestResult = {
    testId: 'monthly-weekday-last-friday',
    testName: 'Monthly - Last Friday (4 months)',
    status: 'PASS',
    expectedBehavior: 'Should generate last Friday of each month for 4 months',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 4,
      generatedDates: dateStrings,
      monthsGenerated: [...new Set(dates.map(getMonthName))],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  // Verify all are Fridays
  for (const date of dates) {
    if (date.getDay() !== 5) {
      result.status = 'FAIL';
      result.issues.push(`${formatDate(date)} is not a Friday`);
    }
  }

  // Verify all are last Friday (within last 7 days of month)
  for (const date of dates) {
    const lastDay = getDate(endOfMonth(date));
    if (date.getDate() < lastDay - 6) {
      result.status = 'FAIL';
      result.issues.push(`${formatDate(date)} is not last Friday (day ${date.getDate()}, last day ${lastDay})`);
    }
  }

  if (dates.length !== 4) {
    result.status = 'FAIL';
    result.issues.push(`Expected 4 instances, got ${dates.length}`);
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest7_5thMonday(): TestResult {
  console.log('\n🔍 Running Test 2.3: Monthly - 5th Monday (6 months) - CRITICAL TEST');
  
  const today = new Date();
  const templateTask: Task = {
    id: 'test-7',
    title: 'Test 5th Monday',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'monthly_weekday',
      weekdays: ['mon'],
      weekNumber: 5,
      generate_unit: 'months',
      generate_value: 6,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);

  const result: TestResult = {
    testId: 'monthly-weekday-5th-monday',
    testName: 'Monthly - 5th Monday (6 months)',
    status: 'PASS',
    expectedBehavior: 'Should ONLY generate in months that actually have 5 Mondays',
    actualResults: {
      generatedCount: dates.length,
      generatedDates: dateStrings,
      monthsGenerated: [...new Set(dates.map(getMonthName))],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  // Check each generated date - verify the month actually has 5 Mondays
  for (const date of dates) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const mondayCount = countWeekdaysInMonth(year, month, 1);
    
    if (mondayCount < 5) {
      result.status = 'FAIL';
      result.issues.push(`${getMonthName(date)} ${year} has only ${mondayCount} Mondays but generated instance`);
    }

    // Verify it's actually a Monday
    if (date.getDay() !== 1) {
      result.status = 'FAIL';
      result.issues.push(`${formatDate(date)} is not a Monday`);
    }
  }

  // Check if months with only 4 Mondays were incorrectly generated
  const generatedMonths = new Set(dates.map(d => `${getMonthName(d)}-${d.getFullYear()}`));
  
  // Check next 6 months from today
  for (let i = 1; i <= 6; i++) {
    const checkDate = addMonths(today, i);
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth();
    const mondayCount = countWeekdaysInMonth(year, month, 1);
    const monthKey = `${getMonthName(checkDate)}-${year}`;
    
    if (mondayCount === 5 && !generatedMonths.has(monthKey)) {
      result.issues.push(`${getMonthName(checkDate)} ${year} has 5 Mondays but was skipped`);
      result.status = 'FAIL';
    }
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest8_WeeklyTueFri(): TestResult {
  console.log('\n🔍 Running Test 3.1: Weekly - Tuesday + Friday (4 weeks)');
  
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  
  const templateTask: Task = {
    id: 'test-8',
    title: 'Test Weekly Tue+Fri',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'weekly',
      weekdays: ['tue', 'fri'],
      generate_unit: 'weeks',
      generate_value: 4,
    },
  };

  const endDate = addWeeks(today, 4);
  const dates = computeWeeklyDatesInRange(templateTask, today, endDate);
  const dateStrings = dates.map(formatDate);

  const result: TestResult = {
    testId: 'weekly-tue-fri',
    testName: 'Weekly - Tuesday + Friday (4 weeks)',
    status: 'PASS',
    expectedBehavior: 'Should generate exactly 8 tasks (2 per week × 4 weeks)',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 8,
      generatedDates: dateStrings,
      monthsGenerated: [],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  if (dates.length !== 8) {
    result.status = 'FAIL';
    result.issues.push(`Expected 8 instances, got ${dates.length}`);
  }

  // Verify all are Tuesday or Friday
  for (const date of dates) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 2 && dayOfWeek !== 5) {
      result.status = 'FAIL';
      result.issues.push(`${formatDate(date)} is not Tuesday or Friday (day ${dayOfWeek})`);
    }
  }

  // Check for duplicates
  const uniqueDates = new Set(dateStrings);
  if (uniqueDates.size !== dates.length) {
    result.status = 'FAIL';
    result.issues.push(`Found duplicate dates`);
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest9_Interval3Days(): TestResult {
  console.log('\n🔍 Running Test 4.1: Interval - Every 3 Days (9 days ahead)');
  
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  
  const templateTask: Task = {
    id: 'test-9',
    title: 'Test Interval 3 Days',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'interval',
      interval_days: 3,
      generate_unit: 'days',
      generate_value: 9,
    },
  };

  // ISSUE: calculateInstanceCount for interval returns value directly
  // If generate_value = 9, it generates 9 instances, not 3
  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);

  const result: TestResult = {
    testId: 'interval-3days',
    testName: 'Interval - Every 3 Days (9 days ahead)',
    status: 'PASS',
    expectedBehavior: 'Should generate exactly 3 tasks (every 3 days within 9 days)',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 3,
      generatedDates: dateStrings,
      monthsGenerated: [],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  // Expected: Day 3, Day 6, Day 9 (3 instances)
  // Actual: May generate 9 instances due to calculateInstanceCount issue
  if (dates.length !== 3) {
    result.status = 'FAIL';
    result.issues.push(`Expected 3 instances (days 3, 6, 9), got ${dates.length}. This indicates calculateInstanceCount bug.`);
  }

  // Verify interval is correct
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 3) {
      result.status = 'FAIL';
      result.issues.push(`Interval mismatch: ${diffDays} days between ${formatDate(dates[i-1])} and ${formatDate(dates[i])}`);
    }
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  console.log(`  ⚠️  NOTE: Expected 3, but got ${dates.length}. This may indicate a bug in calculateInstanceCount.`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

function runTest10_Daily7Days(): TestResult {
  console.log('\n🔍 Running Test 5.1: Daily - 7 Days');
  
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  
  const templateTask: Task = {
    id: 'test-10',
    title: 'Test Daily 7 Days',
    deadline: today.toISOString(),
    recurring_options: {
      type: 'daily',
      generate_unit: 'days',
      generate_value: 7,
    },
  };

  const count = calculateInstanceCount(templateTask.recurring_options!);
  const dates = computeNextNDates(templateTask, count);
  const dateStrings = dates.map(formatDate);

  const result: TestResult = {
    testId: 'daily-7days',
    testName: 'Daily - 7 Days',
    status: 'PASS',
    expectedBehavior: 'Should generate exactly 7 tasks, one per day, consecutive',
    actualResults: {
      generatedCount: dates.length,
      expectedCount: 7,
      generatedDates: dateStrings,
      monthsGenerated: [],
      monthsSkipped: [],
    },
    issues: [],
    notes: [],
  };

  if (dates.length !== 7) {
    result.status = 'FAIL';
    result.issues.push(`Expected 7 instances, got ${dates.length}`);
  }

  // Check for gaps
  for (let i = 1; i < dates.length; i++) {
    const diffDays = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 1) {
      result.status = 'FAIL';
      result.issues.push(`Gap found: ${diffDays} days between ${formatDate(dates[i-1])} and ${formatDate(dates[i])}`);
    }
  }

  console.log(`  ✅ Generated ${dates.length} dates: ${dateStrings.join(', ')}`);
  if (result.status === 'FAIL') {
    console.log(`  ❌ ISSUES: ${result.issues.join('; ')}`);
  }

  return result;
}

// ============================================
// MAIN EXECUTION
// ============================================

function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RECURRING TASK EDGE CASE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  // Run all tests
  results.push(runTest1_Monthly31());
  results.push(runTest2_Monthly30());
  results.push(runTest3_Monthly29());
  results.push(runTest4_Monthly28());
  results.push(runTest5_1stMonday());
  results.push(runTest6_LastFriday());
  results.push(runTest7_5thMonday());
  results.push(runTest8_WeeklyTueFri());
  results.push(runTest9_Interval3Days());
  results.push(runTest10_Daily7Days());

  // Generate report
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    console.log('─────────────────────────────────────────────────────');
    for (const result of results.filter(r => r.status === 'FAIL')) {
      console.log(`\n${result.testName} (${result.testId})`);
      console.log(`  Expected: ${result.expectedBehavior}`);
      console.log(`  Issues: ${result.issues.join('; ')}`);
      if (result.actualResults.generatedDates.length > 0) {
        console.log(`  Generated: ${result.actualResults.generatedDates.join(', ')}`);
      }
    }
  }

  // Generate JSON report
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main();

