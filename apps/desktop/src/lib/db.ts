/**
 * Database utilities for Tauri SQLite plugin
 * Matches mobile app database structure exactly
 */

import Database from "@tauri-apps/plugin-sql";
import type { Task } from "@mydailyops/core";

let db: Database | null = null;

async function getDb(): Promise<Database | null> {
  // Check if we're running in Tauri (window.__TAURI_INTERNALS__ exists)
  // If not, return null to indicate browser mode
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
    console.warn('[DB] Running in browser mode, SQL plugin not available');
    return null;
  }
  
  if (!db) {
    try {
      db = await Database.load("sqlite:mydailyops.db");
    } catch (error) {
      console.error('[DB] Error loading database:', error);
      return null;
    }
  }
  return db;
}

/**
 * Initialize database schema matching Supabase exactly
 */
export async function initDatabase(): Promise<void> {
  // Check if Tauri is available before trying to use SQL plugin
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
    console.warn('[DB] Database not available (browser mode), skipping init');
    return;
  }
  
  try {
    const database = await getDb();
    
    if (!database) {
      console.warn('[DB] Database not available, skipping init');
      return;
    }
    
    // Create table matching Supabase schema EXACTLY
    await database.execute(`
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
        -- Legacy recurring fields (for backward compatibility)
        recurring INTEGER DEFAULT 0,
        recurring_type TEXT,
        recurring_interval_days INTEGER,
        recurring_weekday INTEGER,
        recurring_day_of_month INTEGER,
        last_generated_at TEXT,
        -- New JSON recurring options
        recurring_options TEXT,
        -- Visibility fields (Problem 5: Deadline-anchored duration)
        duration_days INTEGER,
        start_date TEXT,
        visible_from TEXT,
        visible_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    `);

    // Migrate existing tables to add missing columns
    await migrateRecurringFields();
    await migrateVisibilityFields();

    console.log('[Database] Initialized with Supabase-matching schema');
  } catch (error) {
    console.error('[Database] Error initializing:', error);
    throw error;
  }
}

/**
 * Migrate existing tables to add recurring fields if missing
 */
async function migrateRecurringFields(): Promise<void> {
  const columns = [
    { name: 'recurring', type: 'INTEGER DEFAULT 0' },
    { name: 'recurring_type', type: 'TEXT' },
    { name: 'recurring_interval_days', type: 'INTEGER' },
    { name: 'recurring_weekday', type: 'INTEGER' },
    { name: 'recurring_day_of_month', type: 'INTEGER' },
    { name: 'last_generated_at', type: 'TEXT' },
    { name: 'recurring_options', type: 'TEXT' },
  ];

  const migrationDb = await getDb();
  if (!migrationDb) {
    console.warn('[DB] Database not available for migration');
    return;
  }

  for (const col of columns) {
    try {
      await migrationDb.execute(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`);
    } catch (error: any) {
      // Column might already exist, ignore
      if (!error?.message?.includes('duplicate column')) {
        console.warn(`[Database] Could not add column ${col.name}:`, error);
      }
    }
  }
}

/**
 * Migrate existing tables to add visibility fields if missing (Problem 5)
 */
async function migrateVisibilityFields(): Promise<void> {
  const columns = [
    { name: 'duration_days', type: 'INTEGER' },
    { name: 'start_date', type: 'TEXT' },
    { name: 'visible_from', type: 'TEXT' },
    { name: 'visible_until', type: 'TEXT' },
  ];

  const migrationDb = await getDb();
  if (!migrationDb) {
    console.warn('[DB] Database not available for visibility fields migration');
    return;
  }

  for (const col of columns) {
    try {
      await migrationDb.execute(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`);
    } catch (error: any) {
      // Column might already exist, ignore
      if (!error?.message?.includes('duplicate column')) {
        console.warn(`[Database] Could not add visibility column ${col.name}:`, error);
      }
    }
  }
}

/**
 * Load all tasks from cache for current user
 * Matches mobile app's loadTasksFromCache exactly
 */
export async function loadTasksFromCache(userId: string): Promise<Task[]> {
  try {
    const database = await getDb();
    if (!database) {
      console.warn('[DB] Database not available, returning empty array');
      return [];
    }
    const result = await database.select(
      "SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC",
      [userId]
    ) as any[];

    return result.map((row) => {
      // Handle boolean conversions: SQLite stores as 0/1
      const pinned = row.pinned === true || row.pinned === 1 || row.pinned === '1';

      // Parse recurring_options JSON
      let recurringOptions = null;
      if (row.recurring_options) {
        try {
          recurringOptions = typeof row.recurring_options === 'string'
            ? JSON.parse(row.recurring_options)
            : row.recurring_options;
        } catch (e) {
          console.error('[Database] Error parsing recurring_options JSON:', e);
          recurringOptions = null;
        }
      }

      // Compute is_completed from status
      const isCompleted = row.status === 'done';

      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description || '',
        priority: row.priority,
        category: row.category || '',
        deadline: row.deadline,
        status: row.status,
        pinned: pinned,
        created_at: row.created_at,
        updated_at: row.updated_at,
        recurring_options: recurringOptions,
        is_completed: isCompleted,
        // Visibility fields (Problem 5)
        duration_days: row.duration_days ?? null,
        start_date: row.start_date ?? null,
        visible_from: row.visible_from ?? null,
        visible_until: row.visible_until ?? null,
      } as Task;
    });
  } catch (error) {
    console.error('[Database] Error loading tasks:', error);
    throw error;
  }
}

/**
 * Upsert task to cache
 * Matches mobile app's upsertTaskToCache exactly
 */
export async function upsertTaskToCache(task: Task): Promise<void> {
  // Check if database is available first
  const database = await getDb();
  if (!database) {
    console.warn('[DB] Database not available, skipping cache update');
    return;
  }
  
  try {
    // Stringify recurring_options JSON
    const recurringOptionsJson = task.recurring_options
      ? JSON.stringify(task.recurring_options)
      : null;

    // Compute legacy recurring fields from JSON for backward compatibility
    const recurring = task.recurring_options ? 1 : 0;
    const recurringType = task.recurring_options?.type === 'none' ? null : task.recurring_options?.type || null;

    // Extract legacy fields from JSON if available
    let recurringIntervalDays = null;
    let recurringWeekday = null;
    let recurringDayOfMonth = null;

    if (task.recurring_options) {
      if (task.recurring_options.type === 'interval' && task.recurring_options.interval_days) {
        recurringIntervalDays = task.recurring_options.interval_days;
      }
      if (task.recurring_options.type === 'weekly' && task.recurring_options.weekdays && task.recurring_options.weekdays.length > 0) {
        const weekdayMap: Record<string, number> = {
          'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
        };
        recurringWeekday = weekdayMap[task.recurring_options.weekdays[0]] ?? null;
      }
      if (task.recurring_options.type === 'monthly_date' && task.recurring_options.dayOfMonth) {
        recurringDayOfMonth = task.recurring_options.dayOfMonth;
      }
    }
    // Extract visibility fields (Problem 5)
    const durationDays = (task as any).duration_days ?? null;
    const startDate = (task as any).start_date ?? null;
    const visibleFrom = (task as any).visible_from ?? null;
    const visibleUntil = (task as any).visible_until ?? null;

    await database.execute(
      `INSERT INTO tasks (
        id, user_id, title, description, priority, category, deadline, status, pinned, 
        created_at, updated_at,
        recurring, recurring_type, recurring_interval_days, recurring_weekday, 
        recurring_day_of_month, last_generated_at, recurring_options,
        duration_days, start_date, visible_from, visible_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        priority = excluded.priority,
        category = excluded.category,
        deadline = excluded.deadline,
        status = excluded.status,
        pinned = excluded.pinned,
        updated_at = excluded.updated_at,
        recurring = excluded.recurring,
        recurring_type = excluded.recurring_type,
        recurring_interval_days = excluded.recurring_interval_days,
        recurring_weekday = excluded.recurring_weekday,
        recurring_day_of_month = excluded.recurring_day_of_month,
        last_generated_at = excluded.last_generated_at,
        recurring_options = excluded.recurring_options,
        duration_days = excluded.duration_days,
        start_date = excluded.start_date,
        visible_from = excluded.visible_from,
        visible_until = excluded.visible_until`,
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
        recurring,
        recurringType,
        recurringIntervalDays,
        recurringWeekday,
        recurringDayOfMonth,
        null, // last_generated_at - legacy field, not used
        recurringOptionsJson,
        durationDays,
        startDate,
        visibleFrom,
        visibleUntil,
      ]
    );
  } catch (error) {
    console.error('[Database] Error upserting task:', error);
    throw error;
  }
}

/**
 * Get task by ID - SECURITY: Must filter by user_id to prevent cross-user access
 */
export async function getTaskById(id: string, userId: string): Promise<Task | null> {
  try {
    const database = await getDb();
    if (!database) {
      console.warn('[DB] Database not available');
      return null;
    }
    const result = await database.select(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      [id, userId]
    ) as any[];

    if (result.length === 0) return null;

    const row = result[0];
    const pinned = row.pinned === true || row.pinned === 1 || row.pinned === '1';

    let recurringOptions = null;
    if (row.recurring_options) {
      try {
        recurringOptions = typeof row.recurring_options === 'string'
          ? JSON.parse(row.recurring_options)
          : row.recurring_options;
      } catch (e) {
        console.error('[Database] Error parsing recurring_options JSON:', e);
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
    };
  } catch (error) {
    console.error('[Database] Error getting task:', error);
    throw error;
  }
}

/**
 * Delete task from cache - SECURITY: Must filter by user_id to prevent cross-user deletion
 */
export async function deleteTaskFromCache(id: string, userId: string): Promise<void> {
  try {
    const database = await getDb();
    if (!database) {
      console.warn('[DB] Database not available, skipping cache deletion');
      return;
    }
    // SECURITY: Only delete if task belongs to the user
    const result = await database.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
    const rowsAffected = result?.rowsAffected || 0;
    if (rowsAffected === 0) {
      console.warn('[Database] Task not found or access denied:', id);
      throw new Error('Task not found or access denied');
    }
    console.log('[Database] Deleted task:', id);
  } catch (error) {
    console.error('[Database] Error deleting task:', error);
    throw error;
  }
}

/**
 * Get tasks that need sync (local changes not yet pushed)
 * For now, we'll track this via a needs_sync flag in a separate table or metadata
 * For simplicity, we'll sync all tasks on push
 */
export async function getTasksNeedingSync(userId: string): Promise<Task[]> {
  // For now, return all tasks - sync service will handle filtering
  return loadTasksFromCache(userId);
}

/**
 * Mark task as synced (if we add needs_sync tracking later)
 */
export async function markTaskSynced(_id: string): Promise<void> {
  // Placeholder for future sync tracking
}

/**
 * Clear all data (for logout)
 */
export async function clearAllData(): Promise<void> {
  try {
    const database = await getDb();
    if (!database) {
      console.warn('[DB] Database not available, skipping clear');
      return;
    }
    await database.execute("DELETE FROM tasks");
    // Note: Categories table cleanup removed - categories are now simple strings
    console.log('[Database] Cleared all data');
  } catch (error) {
    console.error('[Database] Error clearing data:', error);
    throw error;
  }
}

