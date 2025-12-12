/**
 * Weekend Visibility Control Utilities
 * Implements Problem 8: Weekends Visibility Control
 */

import { startOfDay, getDay } from 'date-fns';
import type { Task } from '../types/task';

export interface WeekendFilterSettings {
  showTasksOnWeekends: boolean;
  hiddenCategoriesOnWeekends: string[];
  hiddenPrioritiesOnWeekends: ('low' | 'medium')[];
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * Uses timezone-stable startOfDay() for consistent results
 * 
 * @param date Date to check
 * @returns true if date is Saturday (6) or Sunday (0)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = getDay(startOfDay(date));
  // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Check if a task should be shown on weekends based on filter settings
 * Implements Problem 8 logic:
 * - If showTasksOnWeekends is true → always show
 * - If task priority is 'high' → always show (high priority always visible)
 * - Otherwise, check category and priority filters
 * 
 * @param task Task to check
 * @param settings Weekend filter settings
 * @param checkDate Date to check (defaults to today)
 * @returns true if task should be shown on the given date
 */
export function shouldShowTaskOnWeekend(
  task: Task,
  settings: WeekendFilterSettings,
  checkDate: Date = new Date()
): boolean {
  // If weekend filtering is disabled, always show
  if (settings.showTasksOnWeekends) {
    return true;
  }

  // If today is not a weekend, always show (filter only applies to weekends)
  if (!isWeekend(checkDate)) {
    return true;
  }

  // High priority tasks ALWAYS remain visible (Problem 8 requirement)
  if (task.priority === 'high') {
    return true;
  }

  // Check if task's category is in hidden list
  const category = task.category || '';
  if (settings.hiddenCategoriesOnWeekends.includes(category)) {
    return false;
  }

  // Check if task's priority is in hidden list
  if (settings.hiddenPrioritiesOnWeekends.includes(task.priority)) {
    return false;
  }

  // Task passes all filters
  return true;
}

