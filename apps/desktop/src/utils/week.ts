/**
 * Week Detection and Calculation Utilities
 * For Problem 10: Weekly Checklists
 * 
 * Handles week boundary detection (Sunday vs Monday start)
 */

import { startOfWeek, endOfWeek, formatISO, startOfDay, isSameDay, addDays, subDays, parseISO } from 'date-fns';

/**
 * Get the start of the week for a given date
 * @param date Date to check
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns Start of week date (normalized to start of day)
 */
export function getWeekStartDate(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  return startOfDay(startOfWeek(date, { weekStartsOn }));
}

/**
 * Get the end of the week for a given date
 * @param date Date to check
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns End of week date (normalized to start of day)
 */
export function getWeekEndDate(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  return startOfDay(endOfWeek(date, { weekStartsOn }));
}

/**
 * Get a unique key for a week (YYYY-MM-DD format of week start)
 * @param date Date within the week
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns Week key as string (YYYY-MM-DD)
 */
export function getWeekKey(date: Date, weekStartsOn: 0 | 1 = 0): string {
  const weekStart = getWeekStartDate(date, weekStartsOn);
  return formatISO(weekStart, { representation: 'date' });
}

/**
 * Check if two dates are in the same week
 * @param date1 First date
 * @param date2 Second date
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns true if dates are in the same week
 */
export function isSameWeek(date1: Date, date2: Date, weekStartsOn: 0 | 1 = 0): boolean {
  const week1Start = getWeekStartDate(date1, weekStartsOn);
  const week2Start = getWeekStartDate(date2, weekStartsOn);
  return isSameDay(week1Start, week2Start);
}

/**
 * Get the current week key
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns Current week key as string (YYYY-MM-DD)
 */
export function getCurrentWeekKey(weekStartsOn: 0 | 1 = 0): string {
  return getWeekKey(new Date(), weekStartsOn);
}

/**
 * Get week range as ISO date strings
 * @param date Date within the week
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns Object with week_start_date and week_end_date as ISO date strings
 */
export function getWeekRange(date: Date, weekStartsOn: 0 | 1 = 0): {
  week_start_date: string;
  week_end_date: string;
} {
  const start = getWeekStartDate(date, weekStartsOn);
  const end = getWeekEndDate(date, weekStartsOn);
  
  return {
    week_start_date: formatISO(start, { representation: 'date' }),
    week_end_date: formatISO(end, { representation: 'date' }),
  };
}

/**
 * Get week range for current week
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns Object with week_start_date and week_end_date as ISO date strings
 */
export function getCurrentWeekRange(weekStartsOn: 0 | 1 = 0): {
  week_start_date: string;
  week_end_date: string;
} {
  return getWeekRange(new Date(), weekStartsOn);
}

/**
 * Check if a week has passed (for history detection)
 * @param weekStartDate Week start date to check
 * @param referenceDate Reference date (default: today)
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns true if week is in the past
 */
export function isPastWeek(
  weekStartDate: Date | string,
  referenceDate: Date = new Date(),
  weekStartsOn: 0 | 1 = 0
): boolean {
  const weekStart = typeof weekStartDate === 'string' 
    ? startOfDay(parseISO(weekStartDate))
    : startOfDay(weekStartDate);
  const currentWeekStart = getWeekStartDate(referenceDate, weekStartsOn);
  return weekStart < currentWeekStart;
}

/**
 * Get next week's start date
 * @param weekStartDate Current week start date
 * @returns Next week start date
 */
export function getNextWeekStart(weekStartDate: Date | string): Date {
  const weekStart = typeof weekStartDate === 'string'
    ? parseISO(weekStartDate)
    : weekStartDate;
  return startOfDay(addDays(weekStart, 7));
}

/**
 * Get previous week's start date
 * @param weekStartDate Current week start date
 * @returns Previous week start date
 */
export function getPreviousWeekStart(weekStartDate: Date | string): Date {
  const weekStart = typeof weekStartDate === 'string'
    ? parseISO(weekStartDate)
    : weekStartDate;
  return startOfDay(subDays(weekStart, 7));
}

