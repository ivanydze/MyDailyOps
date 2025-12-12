/**
 * Weekly Checklist Utilities
 * Problem 10: Always-Show Tasks → Weekly Checklists
 * 
 * Core logic for generating and managing weekly checklists
 */

import { formatISO } from 'date-fns';
import { Crypto } from 'expo-crypto';
import { getCurrentWeekRange, getWeekKey, getWeekRange } from './week';
import type { WeeklyChecklist, ChecklistItem } from '../types/weeklyChecklist';

/**
 * Create a new empty checklist item
 */
export function createChecklistItem(text: string): ChecklistItem {
  return {
    id: Crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    created_at: new Date().toISOString(),
  };
}

/**
 * Create a new empty weekly checklist for the current week
 * @param userId User ID
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns New WeeklyChecklist instance
 */
export function createNewWeeklyChecklist(
  userId: string,
  weekStartsOn: 0 | 1 = 0
): WeeklyChecklist {
  const now = new Date();
  const weekRange = getCurrentWeekRange(weekStartsOn);
  const nowISO = formatISO(now);

  return {
    id: Crypto.randomUUID(),
    user_id: userId,
    week_start_date: weekRange.week_start_date,
    week_end_date: weekRange.week_end_date,
    title: undefined,
    items: [],
    created_at: nowISO,
    updated_at: nowISO,
  };
}

/**
 * Create a new weekly checklist for a specific week
 * @param userId User ID
 * @param date Date within the target week
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns New WeeklyChecklist instance
 */
export function createWeeklyChecklistForWeek(
  userId: string,
  date: Date,
  weekStartsOn: 0 | 1 = 0
): WeeklyChecklist {
  const now = new Date();
  const weekRange = getWeekRange(date, weekStartsOn);
  const nowISO = formatISO(now);

  return {
    id: Crypto.randomUUID(),
    user_id: userId,
    week_start_date: weekRange.week_start_date,
    week_end_date: weekRange.week_end_date,
    title: undefined,
    items: [],
    created_at: nowISO,
    updated_at: nowISO,
  };
}

/**
 * Add a new item to a checklist
 * @param checklist Checklist to add item to
 * @param text Text for the new item
 * @returns Updated checklist
 */
export function addChecklistItem(checklist: WeeklyChecklist, text: string): WeeklyChecklist {
  const newItem = createChecklistItem(text);
  return {
    ...checklist,
    items: [...checklist.items, newItem],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update an existing checklist item
 * @param checklist Checklist containing the item
 * @param itemId ID of the item to update
 * @param updates Partial updates for the item
 * @returns Updated checklist
 */
export function updateChecklistItem(
  checklist: WeeklyChecklist,
  itemId: string,
  updates: Partial<Pick<ChecklistItem, 'text' | 'completed'>>
): WeeklyChecklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    ),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Delete a checklist item
 * @param checklist Checklist containing the item
 * @param itemId ID of the item to delete
 * @returns Updated checklist
 */
export function deleteChecklistItem(checklist: WeeklyChecklist, itemId: string): WeeklyChecklist {
  return {
    ...checklist,
    items: checklist.items.filter((item) => item.id !== itemId),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Toggle completion status of a checklist item
 * @param checklist Checklist containing the item
 * @param itemId ID of the item to toggle
 * @returns Updated checklist
 */
export function toggleChecklistItem(checklist: WeeklyChecklist, itemId: string): WeeklyChecklist {
  return {
    ...checklist,
    items: checklist.items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Calculate completion statistics for a checklist
 * @param checklist Checklist to analyze
 * @returns Completion statistics
 */
export function getChecklistStats(checklist: WeeklyChecklist): {
  total_items: number;
  completed_items: number;
  completion_percentage: number;
} {
  const total = checklist.items.length;
  const completed = checklist.items.filter((item) => item.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total_items: total,
    completed_items: completed,
    completion_percentage: percentage,
  };
}

/**
 * Check if a checklist is for the current week
 * @param checklist Checklist to check
 * @param weekStartsOn 0 = Sunday, 1 = Monday (default: 0)
 * @returns true if checklist is for current week
 */
export function isCurrentWeekChecklist(
  checklist: WeeklyChecklist,
  weekStartsOn: 0 | 1 = 0
): boolean {
  const currentWeekKey = getWeekKey(new Date(), weekStartsOn);
  return checklist.week_start_date === currentWeekKey;
}

/**
 * Validate checklist data
 * @param checklist Checklist to validate
 * @returns true if checklist is valid
 */
export function validateChecklist(checklist: Partial<WeeklyChecklist>): boolean {
  if (!checklist.user_id || !checklist.week_start_date || !checklist.week_end_date) {
    return false;
  }

  if (!Array.isArray(checklist.items)) {
    return false;
  }

  // Validate all items have required fields
  for (const item of checklist.items) {
    if (!item.id || typeof item.text !== 'string' || typeof item.completed !== 'boolean') {
      return false;
    }
  }

  return true;
}

