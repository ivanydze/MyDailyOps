/**
 * Trash/Soft Delete Database Functions (Mobile)
 * Problem 13: Delete All Tasks (Safe Mode)
 */

import * as SQLite from 'expo-sqlite';
import { Task } from '../types/task';
import { getDatabase } from './init';

/**
 * Soft delete a task (move to Trash)
 * Sets deleted_at to current timestamp instead of permanently deleting
 */
export async function softDeleteTask(taskId: string, userId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    "UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [now, now, taskId, userId]
  );

  console.log(`[Trash] Soft deleted task ${taskId}`);
}

/**
 * Soft delete all tasks for a user (Delete All)
 */
export async function softDeleteAllTasks(userId: string): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    "UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND (deleted_at IS NULL OR deleted_at = '')",
    [now, now, userId]
  );

  const count = result?.changes || 0;
  console.log(`[Trash] Soft deleted ${count} tasks for user ${userId}`);
  return count;
}

/**
 * Restore a task from Trash (soft undelete)
 * Sets deleted_at back to NULL
 */
export async function restoreTask(taskId: string, userId: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    "UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?",
    [now, taskId, userId]
  );

  console.log(`[Trash] Restored task ${taskId}`);
}

/**
 * Hard delete a task (permanently remove from Trash)
 * Only works for tasks that are already soft-deleted
 */
export async function hardDeleteTask(taskId: string, userId: string): Promise<void> {
  const db = getDatabase();

  await db.runAsync(
    "DELETE FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
    [taskId, userId]
  );

  console.log(`[Trash] Hard deleted task ${taskId}`);
}

/**
 * Hard delete all tasks in Trash (Empty Trash)
 * Permanently removes all soft-deleted tasks
 */
export async function emptyTrash(userId: string): Promise<number> {
  const db = getDatabase();

  const result = await db.runAsync(
    "DELETE FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL",
    [userId]
  );

  const count = result?.changes || 0;
  console.log(`[Trash] Emptied trash: ${count} tasks permanently deleted`);
  return count;
}

/**
 * Auto-purge old deleted tasks (older than retentionDays)
 * Default: 30 days
 */
export async function autoPurgeTrash(userId: string, retentionDays: number = 30): Promise<number> {
  const db = getDatabase();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffDateStr = cutoffDate.toISOString();

  const result = await db.runAsync(
    "DELETE FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at < ?",
    [userId, cutoffDateStr]
  );

  const count = result?.changes || 0;
  if (count > 0) {
    console.log(`[Trash] Auto-purged ${count} tasks older than ${retentionDays} days`);
  }
  return count;
}

/**
 * Load all tasks from Trash (soft-deleted tasks)
 */
export async function loadTrashFromCache(userId: string): Promise<Task[]> {
  const db = getDatabase();

  const result = await db.getAllAsync<any>(
    "SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at != '' ORDER BY deleted_at DESC",
    [userId]
  );

  return result.map((row) => {
    const pinned = row.pinned === true || row.pinned === 1 || row.pinned === '1';

    // Parse recurring_options JSON
    let recurringOptions = null;
    if (row.recurring_options) {
      try {
        recurringOptions = JSON.parse(row.recurring_options);
      } catch (e) {
        console.error('[Trash] Error parsing recurring_options JSON:', e);
        recurringOptions = null;
      }
    }

    const isCompleted = row.status === 'done';

    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description || '',
      priority: row.priority,
      category: row.category,
      deadline: row.deadline,
      status: row.status,
      pinned: pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      recurring_options: recurringOptions,
      is_completed: isCompleted,
      duration_days: row.duration_days ?? null,
      start_date: row.start_date ?? null,
      visible_from: row.visible_from ?? null,
      visible_until: row.visible_until ?? null,
      deleted_at: row.deleted_at ?? null,
    };
  });
}

/**
 * Get count of tasks in Trash
 */
export async function getTrashCount(userId: string): Promise<number> {
  const db = getDatabase();

  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at != ''",
    [userId]
  );

  return result?.count || 0;
}

