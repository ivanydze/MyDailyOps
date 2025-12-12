/**
 * Database utilities for Weekly Checklists (SQLite)
 * Problem 10: Always-Show Tasks → Weekly Checklists
 */

import * as SQLite from 'expo-sqlite';
import { getDatabase } from './init';
import type { WeeklyChecklist } from '../types/weeklyChecklist';

/**
 * Load weekly checklist for a specific week
 * @param userId User ID
 * @param weekStartDate Week start date (YYYY-MM-DD format)
 * @returns WeeklyChecklist or null if not found
 */
export async function loadWeeklyChecklistFromCache(
  userId: string,
  weekStartDate: string
): Promise<WeeklyChecklist | null> {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<any>(
      "SELECT * FROM weekly_checklists WHERE user_id = ? AND week_start_date = ?",
      [userId, weekStartDate]
    );

    if (!result) return null;

    let items = [];
    if (result.items) {
      try {
        items = typeof result.items === 'string' ? JSON.parse(result.items) : result.items;
      } catch (e) {
        console.error('[DB WeeklyChecklists] Error parsing items JSON:', e);
        items = [];
      }
    }

    return {
      id: result.id,
      user_id: result.user_id,
      week_start_date: result.week_start_date,
      week_end_date: result.week_end_date,
      title: result.title || undefined,
      items: items,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  } catch (error) {
    console.error('[DB WeeklyChecklists] Error loading checklist:', error);
    return null;
  }
}

/**
 * Load current week's checklist
 * @param userId User ID
 * @param weekStartDate Current week start date (YYYY-MM-DD format)
 * @returns WeeklyChecklist or null if not found
 */
export async function loadCurrentWeekChecklistFromCache(
  userId: string,
  weekStartDate: string
): Promise<WeeklyChecklist | null> {
  return loadWeeklyChecklistFromCache(userId, weekStartDate);
}

/**
 * Load all weekly checklists for a user (for history)
 * @param userId User ID
 * @param limit Maximum number of checklists to return (default: 50)
 * @returns Array of WeeklyChecklist sorted by week_start_date DESC
 */
export async function loadWeeklyChecklistsFromCache(
  userId: string,
  limit: number = 50
): Promise<WeeklyChecklist[]> {
  try {
    const db = getDatabase();
    const result = await db.getAllAsync<any>(
      "SELECT * FROM weekly_checklists WHERE user_id = ? ORDER BY week_start_date DESC LIMIT ?",
      [userId, limit]
    );

    return result.map((row) => {
      let items = [];
      if (row.items) {
        try {
          items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
        } catch (e) {
          console.error('[DB WeeklyChecklists] Error parsing items JSON:', e);
          items = [];
        }
      }

      return {
        id: row.id,
        user_id: row.user_id,
        week_start_date: row.week_start_date,
        week_end_date: row.week_end_date,
        title: row.title || undefined,
        items: items,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  } catch (error) {
    console.error('[DB WeeklyChecklists] Error loading checklists:', error);
    return [];
  }
}

/**
 * Upsert weekly checklist to cache
 * @param checklist WeeklyChecklist to save
 */
export async function upsertWeeklyChecklistToCache(checklist: WeeklyChecklist): Promise<void> {
  try {
    const db = getDatabase();
    const itemsJson = JSON.stringify(checklist.items);

    await db.runAsync(
      `INSERT INTO weekly_checklists (
        id, user_id, week_start_date, week_end_date, title, items, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, week_start_date) DO UPDATE SET
        title = excluded.title,
        items = excluded.items,
        updated_at = excluded.updated_at`,
      [
        checklist.id,
        checklist.user_id,
        checklist.week_start_date,
        checklist.week_end_date,
        checklist.title || null,
        itemsJson,
        checklist.created_at,
        checklist.updated_at,
      ]
    );

    console.log('[DB WeeklyChecklists] Saved checklist:', checklist.id, checklist.week_start_date);
  } catch (error) {
    console.error('[DB WeeklyChecklists] Error saving checklist:', error);
    throw error;
  }
}

/**
 * Delete weekly checklist from cache
 * @param checklistId Checklist ID
 * @param userId User ID (for security)
 */
export async function deleteWeeklyChecklistFromCache(
  checklistId: string,
  userId: string
): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync(
      "DELETE FROM weekly_checklists WHERE id = ? AND user_id = ?",
      [checklistId, userId]
    );

    console.log('[DB WeeklyChecklists] Deleted checklist:', checklistId);
  } catch (error) {
    console.error('[DB WeeklyChecklists] Error deleting checklist:', error);
    throw error;
  }
}

