import { Task, RecurringOptions } from '../types/task';
import { loadTasksFromCache, upsertTaskToCache, deleteTaskFromCache } from '../database/init';
import * as Crypto from 'expo-crypto';
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
  subDays,
  formatISO,
  format,
} from 'date-fns';
import { calculateVisibility, isTaskVisible } from './visibility';

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
 * Map day of week (0-6) to weekday string
 */
function dayOfWeekToWeekday(day: number): 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' {
  const weekdays: ('sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat')[] = [
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
  ];
  return weekdays[day];
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
    let nextDate: Date | null = null; // Initialize as nullable

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
        // Weekly is now handled by computeWeeklyDatesInRange, this case should not be reached for actual generation
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

  let futureDates: Date[] = [];

  // Special handling for weekly tasks using date range
  if (configOptions.type === 'weekly') {
    const startDate = templateTask.deadline ? parseISO(templateTask.deadline) : new Date();
    
    // Calculate end date based on generate_unit and generate_value
    let endDate: Date;
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
    futureDates = computeWeeklyDatesInRange(templateTask, startDate, endDate);
    
  } else {
    // For other types, use count-based generation
    const instanceCount = calculateInstanceCount(configOptions);
    futureDates = computeNextNDates(templateTask, instanceCount);
  }

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
      
      const occurrenceTitle = formatOccurrenceTitle(templateTask.title, date);
    
    const instance: Task = {
      ...templateTask,
      id: Crypto.randomUUID(),
      title: occurrenceTitle, // PROBLEM 6: Include deadline in title
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
    };

    instances.push(instance);
  }

  // Insert all instances into database
  for (const instance of instances) {
    await upsertTaskToCache(instance);
  }

  console.log(`[Recurring] Generated ${instances.length} instances for task: ${templateTask.title}`);
  return instances;
}

/**
 * Check if a task is a recurring template
 */
export function isRecurringTemplate(task: Task): boolean {
  return task.recurring_options !== null && 
         task.recurring_options.type !== 'none';
}

/**
 * Find all instances belonging to a template task
 * Uses title + user_id matching to identify instances
 * PROBLEM 6: Updated to handle titles with deadline suffixes
 */
export function findAllInstancesFromTemplate(templateTask: Task, allTasks: Task[]): Task[] {
  const baseTemplateTitle = extractBaseTitle(templateTask.title);
  
  return allTasks.filter(task => {
    if (task.id === templateTask.id) return false; // Not the template itself
    if (task.user_id !== templateTask.user_id) return false;
    if (task.recurring_options) return false; // Instance has no recurring_options
    
    // PROBLEM 6: Compare base titles (without deadline) to handle titles with dates
    const baseTaskTitle = extractBaseTitle(task.title);
    return baseTaskTitle === baseTemplateTitle;
  });
}

/**
 * Find the template task for a given instance
 * Uses title + user_id matching and checks for recurring_options
 */
export function findTemplateFromInstance(instance: Task, allTasks: Task[]): Task | null {
  const baseInstanceTitle = extractBaseTitle(instance.title);
  
  return allTasks.find(task => {
    if (task.id === instance.id) return false; // Not the instance itself
    if (task.user_id !== instance.user_id) return false;
    if (!task.recurring_options || task.recurring_options.type === 'none') return false;
    
    // PROBLEM 6: Compare base titles (without deadline) to handle titles with dates
    const baseTaskTitle = extractBaseTitle(task.title);
    return baseTaskTitle === baseInstanceTitle;
  }) || null;
}

/**
 * Delete all instances of a recurring task (including past and future)
 * Used when deleting a template task
 */
export async function deleteAllInstances(templateTask: Task): Promise<number> {
  const userId = templateTask.user_id;
  const allTasks = await loadTasksFromCache(userId);
  
  const instances = findAllInstancesFromTemplate(templateTask, allTasks);
  let deletedCount = 0;

  for (const instance of instances) {
    // SECURITY: Verify instance belongs to user before deleting
    if (instance.user_id === userId) {
      await deleteTaskFromCache(instance.id, userId);
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
 * Keeps past completed tasks
 */
export async function deleteFutureInstances(templateTask: Task): Promise<number> {
  const userId = templateTask.user_id;
  const allTasks = await loadTasksFromCache(userId);
  
  const now = new Date();
  let deletedCount = 0;

  // Find all tasks with the same base title and user_id that are instances (not the template)
  // PROBLEM 6: Updated to use base title matching (handles titles with deadline)
  // We identify instances by: same base title, same user, no recurring_options, future deadline
  // IMPORTANT: Only delete FUTURE tasks, keep overdue tasks visible so user knows what they missed
  const baseTemplateTitle = extractBaseTitle(templateTask.title);
  
  for (const task of allTasks) {
    const baseTaskTitle = extractBaseTitle(task.title);
    if (
      task.id !== templateTask.id && // Not the template itself
      task.user_id === templateTask.user_id &&
      baseTaskTitle === baseTemplateTitle && // PROBLEM 6: Compare base titles
      !task.recurring_options && // Instance (not recurring)
      task.deadline && // Has deadline
      parseISO(task.deadline) > now && // ONLY future date (overdue tasks are kept!)
      task.status !== 'done' // Not completed
    ) {
      // SECURITY: Verify task belongs to user before deleting
      if (task.user_id === userId) {
        await deleteTaskFromCache(task.id, userId);
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

/**
 * Format occurrence title with deadline
 * Implements Problem 6: Title must include deadline (e.g., "Weekly Report - 12/12/2025")
 * 
 * @param templateTitle The template task title
 * @param deadline The deadline date for this occurrence
 * @returns Formatted title with deadline appended
 */
export function formatOccurrenceTitle(templateTitle: string, deadline: Date | string): string {
  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  
  // Format deadline as MM/DD/YYYY
  const deadlineStr = format(deadlineDate, 'MM/dd/yyyy');
  
  // Check if title already contains a date pattern (to avoid duplication)
  const datePattern = /\d{2}\/\d{2}\/\d{4}/;
  if (datePattern.test(templateTitle)) {
    // If title already has a date, replace it with new date
    return templateTitle.replace(datePattern, deadlineStr);
  }
  
  // Append deadline to title: "Template Title - MM/DD/YYYY"
  return `${templateTitle} - ${deadlineStr}`;
}

/**
 * Extract base title from occurrence title (removes deadline suffix)
 * Used to match occurrences with their template when title includes deadline
 * 
 * @param occurrenceTitle Title that may include deadline (e.g., "Weekly Report - 12/12/2025")
 * @returns Base title without deadline (e.g., "Weekly Report")
 */
export function extractBaseTitle(occurrenceTitle: string): string {
  // Remove date pattern " - MM/DD/YYYY" from the end
  const datePattern = /\s*-\s*\d{2}\/\d{2}\/\d{4}$/;
  return occurrenceTitle.replace(datePattern, '').trim();
}

/**
 * Find the currently active occurrence for a template task
 * Active = visible_from <= today <= visible_until AND status != 'done'
 * 
 * @param templateTask The recurring template task
 * @param allTasks All tasks in the system
 * @returns The active occurrence or null if none exists
 */
export function findActiveOccurrence(templateTask: Task, allTasks: Task[]): Task | null {
  const instances = findAllInstancesFromTemplate(templateTask, allTasks);
  const today = startOfDay(new Date());

  for (const instance of instances) {
    const visibleFrom = (instance as any).visible_from;
    const visibleUntil = (instance as any).visible_until;
    const status = instance.status;

    // Check if this occurrence is currently active
    if (status !== 'done' && isTaskVisible(visibleFrom, visibleUntil, today)) {
      return instance;
    }
  }

  return null;
}

/**
 * Compute the next occurrence deadline date for a template task
 * 
 * @param templateTask The recurring template task
 * @param allTasks All tasks in the system (to find last occurrence)
 * @returns The deadline date for the next occurrence, or null if cannot compute
 */
export function getNextOccurrenceDate(templateTask: Task, allTasks: Task[]): Date | null {
  const options = templateTask.recurring_options;
  if (!options || options.type === 'none') {
    return null;
  }

  // Find the last occurrence (by deadline) to compute next date from
  const instances = findAllInstancesFromTemplate(templateTask, allTasks);
  let baseDate: Date;

  if (instances.length > 0) {
    // Find the latest occurrence deadline
    const sortedInstances = instances
      .filter(i => i.deadline)
      .sort((a, b) => {
        const aDeadline = parseISO(a.deadline!);
        const bDeadline = parseISO(b.deadline!);
        return bDeadline.getTime() - aDeadline.getTime();
      });

    if (sortedInstances.length > 0) {
      baseDate = parseISO(sortedInstances[0].deadline!);
    } else {
      // No instances with deadline, use template deadline or today
      baseDate = templateTask.deadline ? parseISO(templateTask.deadline) : new Date();
    }
  } else {
    // No instances yet, use template deadline or today
    baseDate = templateTask.deadline ? parseISO(templateTask.deadline) : new Date();
  }

  // Preserve original time from template
  let originalTime: { hours: number; minutes: number; seconds: number } | null = null;
  if (templateTask.deadline) {
    const deadlineDate = parseISO(templateTask.deadline);
    originalTime = {
      hours: deadlineDate.getHours(),
      minutes: deadlineDate.getMinutes(),
      seconds: deadlineDate.getSeconds(),
    };
  }

  let nextDate: Date | null = null;

  switch (options.type) {
    case 'daily': {
      nextDate = addDays(baseDate, 1);
      break;
    }

    case 'interval': {
      const intervalDays = options.interval_days || 1;
      nextDate = addDays(baseDate, intervalDays);
      break;
    }

    case 'weekly': {
      // For weekly, find the next matching weekday
      if (!options.weekdays || options.weekdays.length === 0) {
        return null;
      }

      // Start from the day after baseDate
      let currentDate = addDays(baseDate, 1);
      const targetDayNumbers = new Set<number>();
      for (const weekday of options.weekdays) {
        targetDayNumbers.add(weekdayToDayOfWeek(weekday));
      }

      // Search up to 14 days ahead (2 weeks max)
      for (let i = 0; i < 14; i++) {
        const dayOfWeek = getDay(currentDate);
        if (targetDayNumbers.has(dayOfWeek)) {
          nextDate = new Date(currentDate);
          break;
        }
        currentDate = addDays(currentDate, 1);
      }
      break;
    }

    case 'monthly_date': {
      if (!options.dayOfMonth) {
        return null;
      }
      const nextMonth = addMonths(baseDate, 1);
      const targetDay = Math.min(options.dayOfMonth, getDate(endOfMonth(nextMonth)));
      nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDay);
      break;
    }

    case 'monthly_weekday': {
      if (!options.weekdays || options.weekdays.length === 0 || options.weekNumber === undefined) {
        return null;
      }
      const weekday = options.weekdays[0];
      const nextMonth = addMonths(baseDate, 1);

      // Search up to 12 months ahead for valid date
      let candidate: Date | null = null;
      let currentMonth = nextMonth;
      for (let i = 0; i < 12; i++) {
        candidate = getNthWeekdayInMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          weekday,
          options.weekNumber
        );

        if (candidate && isAfter(candidate, baseDate)) {
          nextDate = candidate;
          break;
        }

        currentMonth = addMonths(currentMonth, 1);
        candidate = null;
      }
      break;
    }

    default:
      return null;
  }

  // Restore original time if it existed
  if (originalTime && nextDate) {
    nextDate = setHours(nextDate, originalTime.hours);
    nextDate = setMinutes(nextDate, originalTime.minutes);
    nextDate = setSeconds(nextDate, originalTime.seconds);
  }

  return nextDate;
}

/**
 * Close a previous occurrence by setting its visible_until to the day before the new occurrence starts
 * 
 * @param previousInstance The occurrence to close
 * @param newVisibleFrom The visible_from date of the new occurrence (ISO string)
 * @returns Promise that resolves when the occurrence is closed
 */
export async function closePreviousOccurrence(
  previousInstance: Task,
  newVisibleFrom: string | null
): Promise<void> {
  if (!newVisibleFrom) {
    console.warn('[Recurring] Cannot close previous occurrence: new visible_from is null');
    return;
  }

  try {
    const newVisibleFromDate = parseISO(newVisibleFrom);
    const previousVisibleUntil = subDays(startOfDay(newVisibleFromDate), 1);
    const previousVisibleUntilISO = formatISO(previousVisibleUntil, { representation: 'date' });

    // Update the previous instance's visible_until
    const updatedInstance = {
      ...previousInstance,
      visible_until: previousVisibleUntilISO,
      updated_at: new Date().toISOString(),
    } as Task;

    await upsertTaskToCache(updatedInstance);
    console.log(`[Recurring] Closed previous occurrence ${previousInstance.id}: visible_until = ${previousVisibleUntilISO}`);
  } catch (error) {
    console.error('[Recurring] Error closing previous occurrence:', error);
    throw error;
  }
}

/**
 * Ensure that a template task has an active occurrence
 * Creates a new occurrence if needed, and closes the previous one if it's ending
 * 
 * Implements Problem 2: Only ONE active occurrence at a time
 * 
 * @param templateTask The recurring template task
 * @param allTasks All tasks in the system
 * @returns The active occurrence, or null if none should exist
 */
export async function ensureActiveOccurrence(
  templateTask: Task,
  allTasks: Task[]
): Promise<Task | null> {
  const options = templateTask.recurring_options;
  if (!options || options.type === 'none') {
    return null;
  }

  const today = startOfDay(new Date());
  const activeOccurrence = findActiveOccurrence(templateTask, allTasks);

  // Check if active occurrence is ending or has ended
  let shouldCreateNew = false;
  let shouldClosePrevious = false;

  if (activeOccurrence) {
    const visibleUntil = (activeOccurrence as any).visible_until;
    if (visibleUntil) {
      const visibleUntilDate = startOfDay(parseISO(visibleUntil));
      
      // If visible_until is today or in the past, we need a new occurrence
      if (visibleUntilDate < today || isEqual(visibleUntilDate, today)) {
        shouldCreateNew = true;
        shouldClosePrevious = true;
      }
    } else {
      // No visible_until - this shouldn't happen, but if it does, create new
      shouldCreateNew = true;
      shouldClosePrevious = true;
    }
  } else {
    // No active occurrence, create one
    shouldCreateNew = true;
  }

  if (!shouldCreateNew) {
    // Active occurrence is still valid, return it
    return activeOccurrence;
  }

  // Get the next occurrence date
  const nextDeadline = getNextOccurrenceDate(templateTask, allTasks);
  if (!nextDeadline) {
    console.warn('[Recurring] Cannot compute next occurrence date for template:', templateTask.id);
    return activeOccurrence; // Return existing one if any
  }

  // Calculate visibility for the new occurrence
  const durationDays = (templateTask as any).duration_days ?? null;
  const visibility = calculateVisibility(nextDeadline.toISOString(), durationDays);

  if (!visibility.visible_from) {
    console.warn('[Recurring] Cannot compute visible_from for new occurrence');
    return activeOccurrence;
  }

  // Close previous occurrence if needed (before creating new one to avoid overlap)
  if (shouldClosePrevious && activeOccurrence) {
    await closePreviousOccurrence(activeOccurrence, visibility.visible_from);
  }

  // Create the new occurrence
  const now = new Date().toISOString();
  const occurrenceTitle = formatOccurrenceTitle(templateTask.title, nextDeadline); // PROBLEM 6: Include deadline in title
  
  const newInstance: Task = {
    ...templateTask,
    id: Crypto.randomUUID(),
    title: occurrenceTitle, // PROBLEM 6: Include deadline in title
    deadline: nextDeadline.toISOString(),
    status: 'pending',
    pinned: false,
    created_at: now,
    updated_at: now,
    recurring_options: null, // Instances don't have recurring options
    is_completed: false,
    duration_days: durationDays,
    visible_from: visibility.visible_from,
    visible_until: visibility.visible_until,
  } as Task;

  // Save to database
  await upsertTaskToCache(newInstance);
  console.log(`[Recurring] Created new active occurrence ${newInstance.id} for template ${templateTask.id}: deadline=${nextDeadline.toISOString()}, visible_from=${visibility.visible_from}`);

  return newInstance;
}
