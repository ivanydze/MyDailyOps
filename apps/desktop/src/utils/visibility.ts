/**
 * Task Visibility Calculation Utility
 * Implements Problem 5: Deadline-anchored duration formula
 * 
 * Formula:
 * visible_from = deadline - (duration_days - 1)
 * visible_until = deadline
 * 
 * This ensures tasks with duration cannot disappear before their deadline.
 */

import { parseISO, formatISO, addDays, subDays, startOfDay } from 'date-fns';

/**
 * Calculate visibility range for a task based on deadline/duration or start_date/duration
 * 
 * Implements Problem 5 formulas:
 * - Tasks WITH deadline: visible_from = deadline - (duration_days - 1), visible_until = deadline
 * - Tasks WITHOUT deadline: visible_from = start_date, visible_until = start_date + (duration_days - 1)
 * 
 * @param deadline ISO date string or null/undefined (for tasks with deadline)
 * @param durationDays Duration in days (optional, defaults to 1)
 * @param startDate ISO date string or null/undefined (for tasks without deadline)
 * @returns Object with visible_from and visible_until ISO date strings, or null if neither deadline nor startDate provided
 */
export function calculateVisibility(
  deadline: string | null | undefined,
  durationDays?: number | null,
  startDate?: string | null | undefined
): { visible_from: string | null; visible_until: string | null } {
  // Default duration is 1 day if not specified
  const duration = durationDays && durationDays > 0 ? durationDays : 1;

  // Tasks WITH deadline: calculate from deadline backwards
  if (deadline) {
    try {
      const deadlineDate = parseISO(deadline);
      const deadlineDay = startOfDay(deadlineDate);
      
      // Formula: visible_from = deadline - (duration_days - 1), visible_until = deadline
      const visibleFrom = subDays(deadlineDay, duration - 1);
      const visibleUntil = deadlineDay;
      
      return {
        visible_from: formatISO(startOfDay(visibleFrom), { representation: 'date' }),
        visible_until: formatISO(startOfDay(visibleUntil), { representation: 'date' }),
      };
    } catch (error) {
      console.error('[Visibility] Error calculating visibility from deadline:', error);
      return {
        visible_from: null,
        visible_until: null,
      };
    }
  }

  // Tasks WITHOUT deadline: calculate from start_date forward
  if (startDate) {
    try {
      const startDateObj = parseISO(startDate);
      const startDay = startOfDay(startDateObj);
      
      // Formula: visible_from = start_date, visible_until = start_date + (duration_days - 1)
      const visibleFrom = startDay;
      const visibleUntil = addDays(startDay, duration - 1);
      
      return {
        visible_from: formatISO(startOfDay(visibleFrom), { representation: 'date' }),
        visible_until: formatISO(startOfDay(visibleUntil), { representation: 'date' }),
      };
    } catch (error) {
      console.error('[Visibility] Error calculating visibility from start_date:', error);
      return {
        visible_from: null,
        visible_until: null,
      };
    }
  }

  // Neither deadline nor startDate provided - return null (task visibility undefined)
  return {
    visible_from: null,
    visible_until: null,
  };
}

/**
 * Check if a task is visible on a specific date
 * 
 * @param visibleFrom ISO date string or null
 * @param visibleUntil ISO date string or null
 * @param checkDate Date to check (defaults to today)
 * @returns true if task should be visible on checkDate
 */
export function isTaskVisible(
  visibleFrom: string | null | undefined,
  visibleUntil: string | null | undefined,
  checkDate: Date = new Date()
): boolean {
  const today = startOfDay(checkDate);
  
  // If no visibility range, task is always visible (legacy behavior)
  if (!visibleFrom && !visibleUntil) {
    return true;
  }
  
  // If only visible_until is set, task is visible until that date
  if (!visibleFrom && visibleUntil) {
    try {
      const untilDate = startOfDay(parseISO(visibleUntil));
      return today <= untilDate;
    } catch {
      return true; // Fallback to visible if parsing fails
    }
  }
  
  // If only visible_from is set, task is visible from that date
  if (visibleFrom && !visibleUntil) {
    try {
      const fromDate = startOfDay(parseISO(visibleFrom));
      return today >= fromDate;
    } catch {
      return true; // Fallback to visible if parsing fails
    }
  }
  
  // Both dates are set - check if today is in range
  if (visibleFrom && visibleUntil) {
    try {
      const fromDate = startOfDay(parseISO(visibleFrom));
      const untilDate = startOfDay(parseISO(visibleUntil));
      return today >= fromDate && today <= untilDate;
    } catch {
      return true; // Fallback to visible if parsing fails
    }
  }
  
  return true; // Default: visible
}

/**
 * Check if a task should be visible today
 */
export function isVisibleToday(
  visibleFrom: string | null | undefined,
  visibleUntil: string | null | undefined
): boolean {
  return isTaskVisible(visibleFrom, visibleUntil, new Date());
}

/**
 * Check if a task is upcoming (visible_from is within the next 7 days)
 * Implements Problem 4: Upcoming panel shows tasks that will become visible in the next 7 days
 * 
 * Formula: visible_from > today && visible_from <= today + 7 days
 * 
 * @param visibleFrom ISO date string or null
 * @param checkDate Date to check from (defaults to today)
 * @param daysAhead Number of days ahead to check (defaults to 7)
 * @returns true if task's visible_from is within the next N days
 */
export function isUpcoming(
  visibleFrom: string | null | undefined,
  checkDate: Date = new Date(),
  daysAhead: number = 7
): boolean {
  if (!visibleFrom) {
    // Task without visible_from - not upcoming (already visible or legacy)
    return false;
  }

  try {
    const today = startOfDay(checkDate);
    const futureLimit = addDays(today, daysAhead);
    const fromDate = startOfDay(parseISO(visibleFrom));

    // Task is upcoming if visible_from is:
    // - After today (not visible yet)
    // - Within the next N days
    return fromDate > today && fromDate <= futureLimit;
  } catch (error) {
    console.error('[Visibility] Error checking if task is upcoming:', error);
    return false; // Fallback: not upcoming if parsing fails
  }
}

