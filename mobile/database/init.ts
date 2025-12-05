import * as SQLite from 'expo-sqlite';
import { Task } from '../types/task';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize SQLite database with schema matching Supabase EXACTLY
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('mydailyops.db');

  // Create table matching Supabase schema exactly
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT,
      deadline TEXT,
      status TEXT DEFAULT 'pending',
      pinned INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  `);

  console.log('[Database] Initialized with Supabase-matching schema');
  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Load all tasks from cache for current user
 */
export async function loadTasksFromCache(userId: string): Promise<Task[]> {
  const db = getDatabase();
  const result = await db.getAllAsync<any>(
    `SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  );

  return result.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    category: row.category,
    deadline: row.deadline,
    status: row.status,
    pinned: row.pinned === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Upsert task to cache
 */
export async function upsertTaskToCache(task: Task): Promise<void> {
  const db = getDatabase();

  await db.runAsync(
    `INSERT INTO tasks (
      id, user_id, title, description, priority, category, deadline, status, pinned, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      priority = excluded.priority,
      category = excluded.category,
      deadline = excluded.deadline,
      status = excluded.status,
      pinned = excluded.pinned,
      updated_at = excluded.updated_at
    WHERE id = excluded.id`,
    [
      task.id,
      task.user_id,
      task.title,
      task.description,
      task.priority,
      task.category,
      task.deadline,
      task.status,
      task.pinned ? 1 : 0,
      task.created_at,
      task.updated_at,
    ]
  );
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const db = getDatabase();
  
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM tasks WHERE id = ?`,
    [id]
  );

  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    category: row.category,
    deadline: row.deadline,
    status: row.status,
    pinned: row.pinned === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Delete task from cache
 */
export async function deleteTaskFromCache(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  console.log('[Database] Deleted task:', id);
}

/**
 * Replace all tasks in cache for a user (used during full sync)
 */
export async function replaceAllTasksInCache(userId: string, tasks: Task[]): Promise<void> {
  const db = getDatabase();

  // Delete all existing tasks for this user
  await db.runAsync(`DELETE FROM tasks WHERE user_id = ?`, [userId]);

  // Insert all tasks from server
  for (const task of tasks) {
    await upsertTaskToCache(task);
  }

  console.log(`[Database] Replaced cache with ${tasks.length} tasks for user ${userId}`);
}

/**
 * Clear all data (for logout)
 */
export async function clearAllData(): Promise<void> {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM tasks`);
  console.log('[Database] Cleared all data');
}

/**
 * Drop and recreate tables (for manual resets only)
 */
export async function resetDatabase(): Promise<void> {
  const db = getDatabase();
  
  console.log('[Database] Resetting database...');
  
  await db.execAsync(`DROP TABLE IF EXISTS tasks`);
  
  console.log('[Database] Dropped tasks table');
  
  // Recreate with new schema
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT,
      deadline TEXT,
      status TEXT DEFAULT 'pending',
      pinned INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  `);
  
  console.log('[Database] Reset complete with new schema');
}
