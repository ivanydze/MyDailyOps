/**
 * Recurrence Utility Functions
 */

import type { Weekday } from "./types";
import type { RecurringOptions } from "../models/task";

/**
 * Convert weekday name to day of week number (0 = Sunday, 6 = Saturday)
 */
export function weekdayToNumber(weekday: Weekday): number {
  const map: Record<Weekday, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  return map[weekday];
}

/**
 * Convert day of week number to weekday name
 */
export function numberToWeekday(day: number): Weekday {
  const weekdays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return weekdays[day % 7];
}

/**
 * Get day of week for a date (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Check if a date falls on a specific weekday
 */
export function isWeekday(date: Date, weekday: Weekday): boolean {
  return getDayOfWeek(date) === weekdayToNumber(weekday);
}

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - Year
 * @param month - Month (0-11)
 * @param weekday - Day of week
 * @param weekNumber - Week number (1-5) or -1 for last
 * @returns Date object or null if invalid
 */
export function getNthWeekdayInMonth(
  year: number,
  month: number,
  weekday: Weekday,
  weekNumber: number
): Date | null {
  const dayNumber = weekdayToNumber(weekday);
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  
  // Calculate days to add to get to the first occurrence of the weekday
  let daysToAdd = (dayNumber - firstDayOfWeek + 7) % 7;
  
  if (weekNumber === -1) {
    // Last occurrence: go to next month and subtract 7 days
    const nextMonth = new Date(year, month + 1, 1);
    const lastDay = new Date(nextMonth.getTime() - 1);
    const lastDayOfWeek = lastDay.getDay();
    daysToAdd = (dayNumber - lastDayOfWeek - 7) % 7;
    const result = new Date(year, month, lastDay.getDate() + daysToAdd);
    
    // Verify it's still in the same month
    if (result.getMonth() !== month) {
      return null;
    }
    return result;
  }
  
  // Regular nth occurrence (1-5)
  const result = new Date(year, month, 1 + daysToAdd + (weekNumber - 1) * 7);
  
  // Verify it's still in the same month
  if (result.getMonth() !== month) {
    return null;
  }
  
  return result;
}

/**
 * Normalize recurring options to ensure consistent structure
 */
export function normalizeRecurringOptions(
  options: Partial<RecurringOptions> | null | undefined
): RecurringOptions | null {
  if (!options || options.type === "none" || !options.type) {
    return null;
  }

  return {
    type: options.type,
    interval_days: options.interval_days,
    weekdays: options.weekdays,
    dayOfMonth: options.dayOfMonth,
    weekNumber: options.weekNumber,
    generate_unit: options.generate_unit || "days",
    generate_value: options.generate_value || 7,
    custom: options.custom ?? false,
  };
}

