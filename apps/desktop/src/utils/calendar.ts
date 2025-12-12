/**
 * Calendar View Utilities
 * 
 * Core utilities for Calendar View module (Day, Week, Month, Year)
 * Implements Phase 1: Foundation utilities for calendar functionality
 * 
 * These are pure functions with no React dependencies, making them easily testable
 * and reusable across desktop and mobile applications.
 */

import { parseISO, startOfDay, addDays, isBefore, isEqual, differenceInDays } from 'date-fns';
import type { Task, TravelEvent } from '@mydailyops/core';
import { isTaskVisible } from './visibility';
import { isRecurringTemplate } from './recurring';

/**
 * Extended Task interface for calendar operations
 * Includes visibility fields that are added to Task objects
 */
export interface CalendarTask {
  task: Task;
  visibleFrom: string | null;      // ISO date string (YYYY-MM-DD)
  visibleUntil: string | null;     // ISO date string (YYYY-MM-DD)
  spanDays: number;                // visible_until - visible_from + 1
}

/**
 * Query parameters for fetching calendar tasks
 */
export interface CalendarTaskQuery {
  startDate: Date;                // Start of range (inclusive)
  endDate: Date;                  // End of range (inclusive)
  includeCompleted?: boolean;     // Default: false
  userId: string;
}

/**
 * Group of tasks for a specific day
 */
export interface DayTaskGroup {
  date: Date;                     // The specific day
  dateKey: string;                // ISO date string (YYYY-MM-DD) for keying
  tasks: CalendarTask[];          // Tasks visible on this day
  travelEvents: TravelEvent[];    // Travel events visible on this day (Problem 16)
}

/**
 * Context information for a task on a specific day
 * Useful for UI labels like "Day 3 of 5"
 */
export interface TaskDayContext {
  dayIndex: number;               // Which day of the span (1-based: 1, 2, 3, ...)
  totalDays: number;              // Total span length
  isFirstDay: boolean;
  isLastDay: boolean;
  isMiddleDay: boolean;
}

/**
 * Check if a task's visibility range intersects with a calendar date range
 * 
 * @param visibleFrom ISO date string or null
 * @param visibleUntil ISO date string or null
 * @param rangeStart Start date of calendar range (inclusive)
 * @param rangeEnd End date of calendar range (inclusive)
 * @returns true if task's visibility range overlaps with calendar range
 */
export function doesTaskIntersectDateRange(
  visibleFrom: string | null | undefined,
  visibleUntil: string | null | undefined,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const rangeStartDay = startOfDay(rangeStart);
  const rangeEndDay = startOfDay(rangeEnd);

  // If no visibility range, task is always visible (legacy behavior)
  if (!visibleFrom && !visibleUntil) {
    return true;
  }

  // If only visible_until is set, task is visible until that date
  if (!visibleFrom && visibleUntil) {
    try {
      const untilDate = startOfDay(parseISO(visibleUntil));
      // Task is visible if its until date is >= range start
      return untilDate >= rangeStartDay;
    } catch {
      // Fallback to visible if parsing fails
      return true;
    }
  }

  // If only visible_from is set, task is visible from that date
  if (visibleFrom && !visibleUntil) {
    try {
      const fromDate = startOfDay(parseISO(visibleFrom));
      // Task is visible if its from date is <= range end
      return fromDate <= rangeEndDay;
    } catch {
      // Fallback to visible if parsing fails
      return true;
    }
  }

  // Both dates are set - check if ranges overlap
  // Ranges overlap if: taskFrom <= rangeEnd AND taskUntil >= rangeStart
  if (visibleFrom && visibleUntil) {
    try {
      const taskFrom = startOfDay(parseISO(visibleFrom));
      const taskUntil = startOfDay(parseISO(visibleUntil));
      
      // Intersection: task range overlaps with calendar range
      return taskFrom <= rangeEndDay && taskUntil >= rangeStartDay;
    } catch {
      // Fallback to visible if parsing fails
      return true;
    }
  }

  return true; // Default: visible
}

/**
 * Fetch and filter tasks that intersect with a given date range
 * 
 * Filters out recurring templates and optionally completed tasks,
 * then checks if each task's visibility range intersects with the query range.
 * 
 * @param tasks Array of all tasks
 * @param query Query parameters (date range, filters, userId)
 * @returns Array of CalendarTask objects with visibility metadata
 */
export function getTasksForDateRange(
  tasks: Task[],
  query: CalendarTaskQuery
): CalendarTask[] {
  const { startDate, endDate, includeCompleted = false, userId } = query;

  const result: CalendarTask[] = [];

  for (const task of tasks) {
    // Filter by userId (security: only user's own tasks)
    if ((task as any).user_id !== userId) {
      continue;
    }

    // Filter out recurring templates (only instances should appear in calendar)
    if (isRecurringTemplate(task)) {
      continue;
    }

    // Filter out completed tasks unless includeCompleted is true
    const taskStatus = (task as any).status;
    const isCompleted = taskStatus === 'done' || (task as any).is_completed === true;
    if (isCompleted && !includeCompleted) {
      continue;
    }

    // Get visibility fields from task
    const visibleFrom = (task as any).visible_from ?? null;
    const visibleUntil = (task as any).visible_until ?? null;

    // Check if task's visibility range intersects with query range
    if (!doesTaskIntersectDateRange(visibleFrom, visibleUntil, startDate, endDate)) {
      continue;
    }

    // Calculate span days
    let spanDays = 1; // Default: single day task
    if (visibleFrom && visibleUntil) {
      try {
        const fromDate = startOfDay(parseISO(visibleFrom));
        const untilDate = startOfDay(parseISO(visibleUntil));
        spanDays = differenceInDays(untilDate, fromDate) + 1; // +1 because both dates are inclusive
      } catch {
        // If parsing fails, default to 1 day
        spanDays = 1;
      }
    }

    // Create CalendarTask with metadata
    result.push({
      task,
      visibleFrom,
      visibleUntil,
      spanDays,
    });
  }

  return result;
}

/**
 * Check if a travel event overlaps with a specific date
 * 
 * @param event TravelEvent to check
 * @param date Date to check (will be normalized to start of day)
 * @returns true if event overlaps with the date
 */
export function doesTravelEventOverlapDate(event: TravelEvent, date: Date): boolean {
  try {
    const checkDate = startOfDay(date);
    const eventStart = startOfDay(parseISO(event.start_date));
    const eventEnd = startOfDay(parseISO(event.end_date));

    // Event overlaps if: event.start_date <= date <= event.end_date
    return (isBefore(eventStart, checkDate) || isEqual(eventStart, checkDate)) &&
           (isBefore(checkDate, eventEnd) || isEqual(checkDate, eventEnd));
  } catch {
    return false;
  }
}

/**
 * Filter travel events for a date range
 * 
 * @param events Array of TravelEvent objects
 * @param startDate Start date of range (inclusive)
 * @param endDate End date of range (inclusive)
 * @returns Array of TravelEvent objects that overlap with the date range
 */
export function getTravelEventsForDateRange(
  events: TravelEvent[],
  startDate: Date,
  endDate: Date
): TravelEvent[] {
  const rangeStart = startOfDay(startDate);
  const rangeEnd = startOfDay(endDate);

  return events.filter(event => {
    try {
      const eventStart = startOfDay(parseISO(event.start_date));
      const eventEnd = startOfDay(parseISO(event.end_date));

      // Event overlaps if: event.start_date <= range.end_date AND event.end_date >= range.start_date
      return (isBefore(eventStart, rangeEnd) || isEqual(eventStart, rangeEnd)) &&
             (isBefore(rangeStart, eventEnd) || isEqual(rangeStart, eventEnd));
    } catch {
      return false;
    }
  });
}

/**
 * Group tasks by the days they appear on, handling multi-day spans
 * 
 * A task with visible_from = 2025-01-10 and visible_until = 2025-01-14
 * will appear in DayTaskGroup objects for Jan 10, 11, 12, 13, and 14.
 * 
 * @param calendarTasks Array of CalendarTask objects
 * @param startDate Start date of range (inclusive)
 * @param endDate End date of range (inclusive)
 * @param travelEvents Optional array of TravelEvent objects to include (Problem 16)
 * @returns Array of DayTaskGroup objects, one per day in range
 */
export function groupTasksByDay(
  calendarTasks: CalendarTask[],
  startDate: Date,
  endDate: Date,
  travelEvents: TravelEvent[] = []
): DayTaskGroup[] {
  const result: DayTaskGroup[] = [];

  // Generate all days in range [startDate, endDate] (inclusive)
  const rangeStart = startOfDay(startDate);
  const rangeEnd = startOfDay(endDate);
  
  let currentDate = new Date(rangeStart);

  while (isBefore(currentDate, rangeEnd) || isEqual(startOfDay(currentDate), rangeEnd)) {
    const currentDay = startOfDay(currentDate);
    // Format as YYYY-MM-DD
    const year = currentDay.getFullYear();
    const month = String(currentDay.getMonth() + 1).padStart(2, '0');
    const day = String(currentDay.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // Find all tasks visible on this day
    const tasksForDay: CalendarTask[] = [];

    for (const calendarTask of calendarTasks) {
      const { visibleFrom, visibleUntil } = calendarTask;

      // Use isTaskVisible to check if task is visible on this specific day
      if (isTaskVisible(visibleFrom, visibleUntil, currentDay)) {
        tasksForDay.push(calendarTask);
      }
    }

    // Find travel events for this day
    const eventsForDay = travelEvents.filter(event => 
      doesTravelEventOverlapDate(event, currentDay)
    );

    // Create DayTaskGroup for this day
    result.push({
      date: new Date(currentDay),
      dateKey,
      tasks: tasksForDay,
      travelEvents: eventsForDay,
    });

    // Move to next day
    currentDate = addDays(currentDate, 1);
  }

  return result;
}

/**
 * Provide context information for a task on a specific day
 * 
 * Useful for UI labels like "Day 3 of 5" to show user where they are
 * in a multi-day task span.
 * 
 * @param task CalendarTask object
 * @param date The specific day to get context for
 * @returns TaskDayContext object, or null if task has no visibility range
 */
export function getDayContextForTask(
  task: CalendarTask,
  date: Date
): TaskDayContext | null {
  const { visibleFrom, visibleUntil } = task;

  // If task has no visibility range, return null (no context available)
  if (!visibleFrom || !visibleUntil) {
    return null;
  }

  try {
    const taskFrom = startOfDay(parseISO(visibleFrom));
    const taskUntil = startOfDay(parseISO(visibleUntil));
    const checkDate = startOfDay(date);

    // Check if date is actually within task's visibility range
    if (isBefore(checkDate, taskFrom) || isBefore(taskUntil, checkDate)) {
      // Date is outside task's range - return null
      return null;
    }

    // Calculate which day of the span this is (1-based)
    const dayIndex = differenceInDays(checkDate, taskFrom) + 1;
    const totalDays = differenceInDays(taskUntil, taskFrom) + 1;

    // Determine if this is first, last, or middle day
    const isFirstDay = dayIndex === 1;
    const isLastDay = dayIndex === totalDays;
    const isMiddleDay = !isFirstDay && !isLastDay;

    return {
      dayIndex,
      totalDays,
      isFirstDay,
      isLastDay,
      isMiddleDay,
    };
  } catch {
    // If parsing fails, return null
    return null;
  }
}

