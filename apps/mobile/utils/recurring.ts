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
} from 'date-fns';

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
 * Get the Nth occurrence of a weekday in a month
 */
function getNthWeekdayInMonth(
  year: number,
  month: number,
  weekday: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
  weekNumber: number
): Date {
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
    const targetDate = new Date(year, month, 1 + offset + (weekNumber - 1) * 7);
    const endDate = endOfMonth(firstOfMonth);
    if (targetDate > endDate) {
      return endDate;
    }
    return targetDate;
  }
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
    let nextDate: Date;

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
        if (!options.weekdays || options.weekdays.length === 0) {
          break;
        }

        // Find next weekday
        let found = false;
        for (let j = 1; j <= 14; j++) {
          const checkDate = addDays(currentDate, j);
          const checkWeekday = dayOfWeekToWeekday(getDay(checkDate));
          if (options.weekdays.includes(checkWeekday)) {
            nextDate = checkDate;
            currentDate = new Date(checkDate);
            found = true;
            break;
          }
        }

        if (!found) {
          // Fallback
          const firstWeekday = options.weekdays[0];
          const dayOfWeek = weekdayToDayOfWeek(firstWeekday);
          const currentDay = getDay(currentDate);
          let offset = (dayOfWeek - currentDay + 7) % 7;
          if (offset === 0) offset = 7;
          nextDate = addDays(currentDate, offset);
          currentDate = new Date(nextDate);
        }
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
        
        let candidate = getNthWeekdayInMonth(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          weekday,
          options.weekNumber
        );

        // Ensure it's after the current date
        if (!isAfter(candidate, startDate) || isEqual(candidate, startDate)) {
          currentDate = addMonths(currentDate, 1);
          candidate = getNthWeekdayInMonth(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            weekday,
            options.weekNumber
          );
        }

        nextDate = candidate;
        currentDate = new Date(nextDate);
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
      // For interval, use generate_value as number of instances
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

  // Calculate how many instances to generate
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
    const instance: Task = {
      ...templateTask,
      id: Crypto.randomUUID(),
      deadline: date.toISOString(),
      status: 'pending',
      pinned: false,
      created_at: now,
      updated_at: now,
      recurring_options: null, // Instances are not recurring themselves
      is_completed: false,
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
 * Delete all future instances of a recurring task
 * Keeps past completed tasks
 */
export async function deleteFutureInstances(templateTask: Task): Promise<number> {
  const userId = templateTask.user_id;
  const allTasks = await loadTasksFromCache(userId);
  
  const now = new Date();
  let deletedCount = 0;

  // Find all tasks with the same title and user_id that are instances (not the template)
  // We identify instances by: same title, same user, no recurring_options, future deadline
  for (const task of allTasks) {
    if (
      task.id !== templateTask.id && // Not the template itself
      task.user_id === templateTask.user_id &&
      task.title === templateTask.title &&
      !task.recurring_options && // Instance (not recurring)
      task.deadline && // Has deadline
      parseISO(task.deadline) > now && // Future date
      task.status !== 'done' // Not completed
    ) {
      await deleteTaskFromCache(task.id);
      deletedCount++;
    }
  }

  console.log(`[Recurring] Deleted ${deletedCount} future instances for task: ${templateTask.title}`);
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
