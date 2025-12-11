/**
 * Recurring task generation utility for desktop app
 * Matches mobile app's recurring logic exactly
 */

import type { Task, RecurringOptions } from '@mydailyops/core';
import * as db from '../lib/db';
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
} from 'date-fns';
import { calculateVisibility } from './visibility';

/**
 * Map weekday string to day of week (0 = Sunday, 6 = Saturday)
 */
function weekdayToDayOfWeek(weekday: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'): number {
  const map: Record<string, number> = {
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
 * Count how many times a weekday occurs in a month
 */
function countWeekdaysInMonth(
  year: number,
  month: number,
  weekday: number
): number {
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

/**
 * Get the Nth occurrence of a weekday in a month
 * Returns null if the Nth occurrence doesn't exist (e.g., 5th Monday when month only has 4)
 */
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
    // Last occurrence - always exists
    const lastOfMonth = endOfMonth(firstOfMonth);
    const lastWeekday = lastOfMonth.getDay();
    const lastOffset = (lastWeekday - dayOfWeek + 7) % 7;
    const lastDate = new Date(year, month, getDate(lastOfMonth) - lastOffset);
    return lastDate;
  } else {
    // For 1st-5th occurrence, validate that it exists
    const actualCount = countWeekdaysInMonth(year, month, dayOfWeek);
    if (weekNumber > actualCount) {
      // The Nth occurrence doesn't exist in this month
      return null;
    }
    
    const targetDate = new Date(year, month, 1 + offset + (weekNumber - 1) * 7);
    const endDate = endOfMonth(firstOfMonth);
    if (targetDate > endDate) {
      // Should not happen if validation above works, but double-check
      return null;
    }
    return targetDate;
  }
}

/**
 * Compute weekly recurring dates within a date range
 * @param templateTask The master recurring task
 * @param startDate Start date (deadline or today)
 * @param endDate End date (startDate + generate_value × generate_unit)
 * @returns Array of Date objects for all matching weekday occurrences
 */
function computeWeeklyDatesInRange(
  templateTask: Task,
  startDate: Date,
  endDate: Date
): Date[] {
  const options = templateTask.recurring_options;
  if (!options || options.type !== 'weekly' || !options.weekdays || options.weekdays.length === 0) {
    return [];
  }

  console.log(`[Recurring][Weekly] Generating occurrences from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Preserve original time
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
  
  // Convert weekday strings to day numbers (0 = Sunday, 6 = Saturday)
  const targetDayNumbers = new Set<number>();
  for (const weekday of options.weekdays) {
    targetDayNumbers.add(weekdayToDayOfWeek(weekday));
  }

  // Iterate day by day from start to end (inclusive)
  // Start from the day after the start date to avoid including the template's deadline
  let currentDate = addDays(start, 1);
  
  while (isBefore(currentDate, end) || isEqual(startOfDay(currentDate), end)) {
    const dayOfWeek = getDay(currentDate);
    const currentDayStart = startOfDay(currentDate);
    
    // Check if this date matches one of the selected weekdays
    // Only include dates that are today or in the future (not past)
    if (targetDayNumbers.has(dayOfWeek) && (isAfter(currentDayStart, now) || isEqual(currentDayStart, now))) {
      let dateWithTime = new Date(currentDate);
      
      // Restore original time if it existed
      if (originalTime) {
        dateWithTime = setHours(dateWithTime, originalTime.hours);
        dateWithTime = setMinutes(dateWithTime, originalTime.minutes);
        dateWithTime = setSeconds(dateWithTime, originalTime.seconds);
      }
      
      dates.push(dateWithTime);
      console.log(`[Recurring][Weekly] Added: ${dateWithTime.toISOString()}`);
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1);
  }

  console.log(`[Recurring][Weekly] Generated ${dates.length} occurrences`);
  return dates;
}

/**
 * Compute the next N recurring dates for a template task
 * @param templateTask The master recurring task
 * @param count Number of instances to generate
 * @returns Array of Date objects for future deadlines
 */
function computeNextNDates(templateTask: Task, count: number): Date[] {
  const options = templateTask.recurring_options;
  if (!options || options.type === 'none') {
    return [];
  }

  const startDate = templateTask.deadline ? parseISO(templateTask.deadline) : new Date();
  
  // Preserve original time
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
        // Weekly uses date-range generation instead of count-based
        // This is handled separately in generateRecurringInstances
        // This case should not be reached in the count-based loop
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
        const maxAttempts = 12; // Prevent infinite loop (max 12 months)
        
        while (!candidate && attempts < maxAttempts) {
          candidate = getNthWeekdayInMonth(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            weekday,
            options.weekNumber
          );
          
          // If candidate is null, the Nth occurrence doesn't exist in this month - skip it
          if (!candidate) {
            currentDate = addMonths(currentDate, 1);
            attempts++;
            continue;
          }
          
          // Ensure it's after the start date
          if (!isAfter(candidate, startDate) || isEqual(candidate, startDate)) {
            currentDate = addMonths(currentDate, 1);
            candidate = null; // Reset to search next month
            attempts++;
            continue;
          }
          
          // Valid candidate found
          break;
        }

        if (candidate) {
          nextDate = candidate;
          currentDate = new Date(nextDate);
        }
        // If no valid candidate found after maxAttempts, nextDate remains null and generation stops
        break;
      }

      default:
        return dates;
    }

    // Restore original time if it existed
    if (originalTime && nextDate) {
      nextDate = setHours(nextDate, originalTime.hours);
      nextDate = setMinutes(nextDate, originalTime.minutes);
      nextDate = setSeconds(nextDate, originalTime.seconds);
    }

    if (nextDate) {
      dates.push(nextDate);
    } else {
      // If no date was computed for this iteration, stop generating
      console.warn(`[Recurring] Could not compute date for iteration ${i}, stopping generation`);
      break;
    }
  }

  return dates;
}

/**
 * Get default generation config based on recurring type
 */
function getDefaultGenerationConfig(type: RecurringOptions['type']): { unit: 'days' | 'weeks' | 'months'; value: number } {
  switch (type) {
    case 'daily':
      return { unit: 'days', value: 7 };
    case 'weekly':
      return { unit: 'weeks', value: 4 };
    case 'monthly_date':
    case 'monthly_weekday':
      return { unit: 'months', value: 3 };
    case 'interval':
      return { unit: 'days', value: 7 };
    default:
      return { unit: 'days', value: 7 };
  }
}

/**
 * Calculate how many instances to generate based on generate_unit and generate_value
 */
function calculateInstanceCount(options: RecurringOptions): number {
  const unit = options.generate_unit || 'days';
  const value = options.generate_value || 7;
  
  switch (options.type) {
    case 'daily':
      // If generate_unit is 'days', generate that many instances
      if (unit === 'days') return value;
      // Convert weeks/months to days
      if (unit === 'weeks') return value * 7;
      if (unit === 'months') return value * 30; // Approximate
      return 7;
    
    case 'weekly':
      // If generate_unit is 'weeks', generate that many instances
      if (unit === 'weeks') return value;
      // Convert days/months to weeks
      if (unit === 'days') return Math.ceil(value / 7);
      if (unit === 'months') return value * 4; // Approximate
      return 4;
    
    case 'monthly_date':
    case 'monthly_weekday':
      // If generate_unit is 'months', generate that many instances
      if (unit === 'months') return value;
      // Convert days/weeks to months
      if (unit === 'days') return Math.ceil(value / 30);
      if (unit === 'weeks') return Math.ceil(value / 4);
      return 3;
    
    case 'interval':
      // For interval, calculate how many instances fit in the time range
      const intervalDays = options.interval_days || 1;
      if (unit === 'days') {
        // Example: "every 3 days for 9 days" = 9 / 3 = 3 instances
        return Math.floor(value / intervalDays);
      } else if (unit === 'weeks') {
        // Convert weeks to days and calculate
        const daysInRange = value * 7;
        return Math.floor(daysInRange / intervalDays);
      } else if (unit === 'months') {
        // Approximate months as 30 days
        const daysInRange = value * 30;
        return Math.floor(daysInRange / intervalDays);
      }
      // Fallback: use value as-is (legacy behavior)
      return value;
    
    default:
      return 7;
  }
}

/**
 * Generate recurring task instances from a template task
 * Inserts all instances into the database
 */
export async function generateRecurringInstances(templateTask: Task): Promise<Task[]> {
  const options = templateTask.recurring_options;
  if (!options || options.type === 'none') {
    return [];
  }

  // Use default config if not provided
  const defaultConfig = getDefaultGenerationConfig(options.type);
  const unit = options.generate_unit || defaultConfig.unit;
  const value = options.generate_value || defaultConfig.value;

  // Update template with generation config if missing
  const configOptions: RecurringOptions = {
    ...options,
    generate_unit: unit,
    generate_value: value,
    custom: options.custom || false,
  };

  // For weekly tasks, use date-range generation instead of count-based
  if (configOptions.type === 'weekly') {
    const startDate = templateTask.deadline ? parseISO(templateTask.deadline) : new Date();
    
    // Calculate end date based on generate_unit and generate_value
    let endDate: Date;
    const unit = configOptions.generate_unit || 'weeks';
    const value = configOptions.generate_value || 4;
    
    if (unit === 'weeks') {
      endDate = addWeeks(startDate, value);
    } else if (unit === 'days') {
      endDate = addDays(startDate, value);
    } else if (unit === 'months') {
      endDate = addMonths(startDate, value);
    } else {
      endDate = addWeeks(startDate, value); // Default to weeks
    }
    
    // Generate all weekly occurrences in the date range
    const futureDates = computeWeeklyDatesInRange(templateTask, startDate, endDate);
    
    if (futureDates.length === 0) {
      console.log('[Recurring] No dates computed for weekly recurring task');
      return [];
    }

    const now = new Date().toISOString();
    const instances: Task[] = [];

    // Create instance for each future date
    for (const date of futureDates) {
      // Calculate visibility for this instance (Problem 5)
      const durationDays = (templateTask as any).duration_days ?? null;
      const visibility = calculateVisibility(date.toISOString(), durationDays);
      
      const instance: Task = {
        ...templateTask,
        id: crypto.randomUUID(),
        deadline: date.toISOString(),
        status: 'pending',
        pinned: false,
        created_at: now,
        updated_at: now,
        recurring_options: null, // Instances don't have recurring options
        is_completed: false,
        // Add visibility fields for this instance
        duration_days: durationDays,
        visible_from: visibility.visible_from,
        visible_until: visibility.visible_until,
      } as Task;

      instances.push(instance);
    }

    // Insert all instances into database
    for (const instance of instances) {
      await db.upsertTaskToCache(instance);
    }

    console.log(`[Recurring] Generated ${instances.length} instances for weekly task: ${templateTask.title}`);
    return instances;
  }

  // For other types, use count-based generation
  const instanceCount = calculateInstanceCount(configOptions);

  // Compute all future dates
  const futureDates = computeNextNDates(templateTask, instanceCount);

  if (futureDates.length === 0) {
    console.log('[Recurring] No dates computed for recurring task');
    return [];
  }

  const now = new Date().toISOString();
  const instances: Task[] = [];

  // Create instance for each future date
  for (const date of futureDates) {
    // Calculate visibility for this instance (Problem 5)
    const durationDays = (templateTask as any).duration_days ?? null;
    const visibility = calculateVisibility(date.toISOString(), durationDays);
    
    const instance: Task = {
      ...templateTask,
      id: crypto.randomUUID(),
      deadline: date.toISOString(),
      status: 'pending',
      pinned: false,
      created_at: now,
      updated_at: now,
      recurring_options: null, // Instances are not recurring themselves
      is_completed: false,
      // Add visibility fields for this instance
      duration_days: durationDays,
      visible_from: visibility.visible_from,
      visible_until: visibility.visible_until,
    } as Task;

    instances.push(instance);
  }

  // Insert all instances into database
  for (const instance of instances) {
    await db.upsertTaskToCache(instance);
  }

  console.log(`[Recurring] Generated ${instances.length} instances for task: ${templateTask.title}`);
  return instances;
}

/**
 * Check if a task is a recurring template
 */
export function isRecurringTemplate(task: Task): boolean {
  return task.recurring_options !== null && 
         task.recurring_options !== undefined &&
         task.recurring_options.type !== 'none';
}

/**
 * Find all instances belonging to a template task
 * Uses title + user_id matching to identify instances
 */
export function findAllInstancesFromTemplate(templateTask: Task, allTasks: Task[]): Task[] {
  return allTasks.filter(task => 
    task.id !== templateTask.id && // Not the template itself
    task.user_id === templateTask.user_id &&
    task.title === templateTask.title &&
    !task.recurring_options // Instance has no recurring_options
  );
}

/**
 * Find the template task for a given instance
 * Uses title + user_id matching and checks for recurring_options
 */
export function findTemplateFromInstance(instance: Task, allTasks: Task[]): Task | null {
  return allTasks.find(task => 
    task.id !== instance.id && // Not the instance itself
    task.user_id === instance.user_id &&
    task.title === instance.title &&
    task.recurring_options !== null && // Template has recurring_options
    task.recurring_options !== undefined &&
    task.recurring_options.type !== 'none'
  ) || null;
}

/**
 * Delete all instances of a recurring task (including past and future)
 * Used when deleting a template task
 */
export async function deleteAllInstances(templateTask: Task): Promise<number> {
  const userId = templateTask.user_id;
  const allTasks = await db.loadTasksFromCache(userId);
  
  const instances = findAllInstancesFromTemplate(templateTask, allTasks);
  let deletedCount = 0;

  for (const instance of instances) {
    // SECURITY: Verify instance belongs to user before deleting
    if (instance.user_id === userId) {
      await db.deleteTaskFromCache(instance.id, userId);
      deletedCount++;
    } else {
      console.warn('[Recurring] SECURITY: Skipping instance belonging to another user:', instance.id);
    }
  }

  console.log(`[Recurring] Deleted ${deletedCount} instances for template: ${templateTask.title}`);
  return deletedCount;
}

/**
 * Delete all future instances of a recurring task
 * Keeps past completed tasks and overdue pending tasks (so user can see what they missed)
 */
export async function deleteFutureInstances(templateTask: Task): Promise<number> {
  const userId = templateTask.user_id;
  const allTasks = await db.loadTasksFromCache(userId);
  
  const now = new Date();
  let deletedCount = 0;

  // Find all tasks with the same title and user_id that are instances (not the template)
  // We identify instances by: same title, same user, no recurring_options, future deadline
  // IMPORTANT: Only delete FUTURE tasks, keep overdue tasks visible so user knows what they missed
  for (const task of allTasks) {
    if (
      task.id !== templateTask.id && // Not the template itself
      task.user_id === templateTask.user_id &&
      task.title === templateTask.title &&
      !task.recurring_options && // Instance (not recurring)
      task.deadline && // Has deadline
      parseISO(task.deadline) > now && // ONLY future date (overdue tasks are kept!)
      task.status !== 'done' // Not completed
    ) {
      // SECURITY: Verify task belongs to user before deleting
      if (task.user_id === userId) {
        await db.deleteTaskFromCache(task.id, userId);
        deletedCount++;
      } else {
        console.warn('[Recurring] SECURITY: Skipping task belonging to another user:', task.id);
      }
    }
  }

  console.log(`[Recurring] Deleted ${deletedCount} future instances for task: ${templateTask.title} (kept overdue tasks)`);
  return deletedCount;
}

/**
 * Apply recurring configuration to a task
 * Updates the template task with generation config defaults if missing
 */
export function applyRecurringConfig(task: Task, recurringOptions: RecurringOptions | null): Task {
  if (!recurringOptions || recurringOptions.type === 'none') {
    return {
      ...task,
      recurring_options: null,
    };
  }

  // Apply default generation config if missing
  const defaultConfig = getDefaultGenerationConfig(recurringOptions.type);
  const configOptions: RecurringOptions = {
    ...recurringOptions,
    generate_unit: recurringOptions.generate_unit || defaultConfig.unit,
    generate_value: recurringOptions.generate_value || defaultConfig.value,
    custom: recurringOptions.custom || false,
  };

  return {
    ...task,
    recurring_options: configOptions,
  };
}

