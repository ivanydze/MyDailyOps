import * as SQLite from 'expo-sqlite';
import { Task } from '../types/task';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Safe helper to add a column if it doesn't exist
 * Returns true if column was added, false if it already exists
 */
async function addColumnIfMissing(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string
): Promise<boolean> {
  try {
    const result = await database.getAllAsync<{ name: string; type: string }>(
      `PRAGMA table_info(${table})`
    );
    const exists = result.some((r) => r.name === column);
    if (!exists) {
      await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[Database] ✅ Added missing column: ${column}`);
      return true;
    } else {
      console.log(`[Database] ✓ Column already exists: ${column}`);
      return false;
    }
  } catch (error) {
    console.error(`[Database] ❌ Error adding column ${column}:`, error);
    return false;
  }
}

/**
 * Migrate existing database to add ALL recurring fields (legacy + JSON)
 * Uses PRAGMA table_info to check if columns exist before adding
 */
async function migrateRecurringFields(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('[Database] 🔄 Checking for recurring columns...');
    
    // Add ALL legacy recurring columns
    await addColumnIfMissing(database, 'tasks', 'recurring', 'INTEGER DEFAULT 0');
    await addColumnIfMissing(database, 'tasks', 'recurring_type', 'TEXT');
    await addColumnIfMissing(database, 'tasks', 'recurring_interval_days', 'INTEGER');
    await addColumnIfMissing(database, 'tasks', 'recurring_weekday', 'INTEGER');
    await addColumnIfMissing(database, 'tasks', 'recurring_day_of_month', 'INTEGER');
    await addColumnIfMissing(database, 'tasks', 'last_generated_at', 'TEXT');
    
    // Add new recurring_options JSON column
    await addColumnIfMissing(database, 'tasks', 'recurring_options', 'TEXT');
    
    console.log('[Database] ✅ Migration completed');
  } catch (error) {
    console.error('[Database] ❌ Migration error:', error);
    // Don't throw - allow app to continue even if migration fails
  }
}

/**
 * Initialize SQLite database with schema matching Supabase EXACTLY
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('mydailyops.db');

  // Create table matching Supabase schema EXACTLY with ALL recurring fields
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
      -- Legacy recurring fields (for backward compatibility)
      recurring INTEGER DEFAULT 0,
      recurring_type TEXT,
      recurring_interval_days INTEGER,
      recurring_weekday INTEGER,
      recurring_day_of_month INTEGER,
      last_generated_at TEXT,
      -- New JSON recurring options
      recurring_options TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  `);

  // 🔥 CRITICAL: Check and migrate recurring fields for EXISTING tables
  // CREATE TABLE IF NOT EXISTS won't add columns to existing tables!
  await migrateRecurringFields(db);

  // Diagnostic: Log actual table structure
  try {
    const tableInfo = await db.getAllAsync<any>(`PRAGMA table_info(tasks)`);
    const columnNames = tableInfo.map((col: any) => col.name);
    console.log('[Database] 📋 Actual table columns:', columnNames.join(', '));
    
    // Verify all required columns exist
    const requiredColumns = [
      'recurring',
      'recurring_type',
      'recurring_interval_days',
      'recurring_weekday',
      'recurring_day_of_month',
      'last_generated_at',
      'recurring_options',
    ];
    
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    if (missingColumns.length > 0) {
      console.error('[Database] ❌ MISSING columns:', missingColumns.join(', '));
    } else {
      console.log('[Database] ✅ All recurring columns present');
    }
  } catch (err) {
    console.error('[Database] Error checking table structure:', err);
  }

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
 * Handles both legacy recurring fields and new JSON structure
 */
export async function loadTasksFromCache(userId: string): Promise<Task[]> {
  const db = getDatabase();
  const result = await db.getAllAsync<any>(
    `SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  );

  return result.map((row) => {
    // Handle boolean conversions: SQLite stores as 0/1, but can also be boolean
    const pinned = row.pinned === true || row.pinned === 1 || row.pinned === '1';
    
    // Parse recurring_options JSON
    let recurringOptions = null;
    if (row.recurring_options) {
      try {
        recurringOptions = JSON.parse(row.recurring_options);
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
      category: row.category,
      deadline: row.deadline,
      status: row.status,
      pinned: pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Recurring options - parse from JSON (legacy fields ignored, JSON is source of truth)
      recurring_options: recurringOptions,
      is_completed: isCompleted,
    };
  });
}

/**
 * Upsert task to cache
 * Writes ALL fields including legacy recurring fields for compatibility
 */
export async function upsertTaskToCache(task: Task): Promise<void> {
  const db = getDatabase();

  // Stringify recurring_options JSON
  const recurringOptionsJson = task.recurring_options 
    ? JSON.stringify(task.recurring_options) 
    : null;

  // Compute legacy recurring fields from JSON for backward compatibility
  // This ensures old code/queries still work
  // Set recurring = 1 if recurring_options exists (not null), otherwise 0
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
      // Map weekday string to number (sun=0, mon=1, etc.)
      const weekdayMap: Record<string, number> = {
        'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
      };
      recurringWeekday = weekdayMap[task.recurring_options.weekdays[0]] ?? null;
    }
    if (task.recurring_options.type === 'monthly_date' && task.recurring_options.dayOfMonth) {
      recurringDayOfMonth = task.recurring_options.dayOfMonth;
    }
  }

  try {
    await db.runAsync(
      `INSERT INTO tasks (
        id, user_id, title, description, priority, category, deadline, status, pinned, 
        created_at, updated_at,
        recurring, recurring_type, recurring_interval_days, recurring_weekday, 
        recurring_day_of_month, last_generated_at, recurring_options
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        recurring_options = excluded.recurring_options`,
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
        null, // last_generated_at - legacy field, not used in pre-generation model
        recurringOptionsJson,
      ]
    );
  } catch (error) {
    console.error('[Database] ❌ Error upserting task:', error);
    throw error;
  }
}

/**
 * Get task by ID
 * Handles both legacy recurring fields and new JSON structure
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const db = getDatabase();
  
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM tasks WHERE id = ?`,
    [id]
  );

  if (!row) return null;

  // Handle boolean conversions: SQLite stores as 0/1, but can also be boolean
  const pinned = row.pinned === true || row.pinned === 1 || row.pinned === '1';
  
  // Parse recurring_options JSON
  let recurringOptions = null;
  if (row.recurring_options) {
    try {
      recurringOptions = JSON.parse(row.recurring_options);
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
    category: row.category,
    deadline: row.deadline,
    status: row.status,
    pinned: pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Recurring options - parse from JSON (legacy fields ignored)
    recurring_options: recurringOptions,
    is_completed: isCompleted,
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
 * Uses transaction to ensure atomicity
 */
export async function replaceAllTasksInCache(userId: string, tasks: Task[]): Promise<void> {
  const db = getDatabase();

  try {
    // Use transaction for atomicity
    await db.execAsync('BEGIN TRANSACTION');

    // Delete all existing tasks for this user
    await db.runAsync(`DELETE FROM tasks WHERE user_id = ?`, [userId]);

    // Insert all tasks from server
    for (const task of tasks) {
      await upsertTaskToCache(task);
    }

    await db.execAsync('COMMIT');
    console.log(`[Database] ✅ Replaced cache with ${tasks.length} tasks for user ${userId}`);
  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('[Database] ❌ Error replacing cache, rolled back:', error);
    throw error;
  }
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
 * Diagnostic function: Print actual table structure
 * Call this to verify recurring columns exist in SQLite
 */
export async function diagnoseTableStructure(): Promise<void> {
  try {
    const db = getDatabase();
    const tableInfo = await db.getAllAsync<any>(`PRAGMA table_info(tasks)`);
    
    console.log('\n[Database] 🔍 TABLE STRUCTURE DIAGNOSTIC:');
    console.log('='.repeat(50));
    tableInfo.forEach((col: any) => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    console.log('='.repeat(50));
    
    const columnNames = tableInfo.map((col: any) => col.name);
    
    const requiredColumns = [
      'recurring',
      'recurring_type',
      'recurring_interval_days',
      'recurring_weekday',
      'recurring_day_of_month',
      'last_generated_at',
      'recurring_options',
    ];
    
    console.log('\n[Database] Checking required recurring columns:');
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('  ❌ MISSING:', missingColumns.join(', '));
      console.log('\n[Database] ❌ Some recurring columns are missing');
      console.log('[Database] Run resetDatabase() or migration to fix');
    } else {
      console.log('  ✅ All recurring columns present');
    }
  } catch (error) {
    console.error('[Database] Diagnostic error:', error);
  }
}

/**
 * Drop and recreate tables (for manual resets only)
 * Uses COMPLETE schema matching Supabase exactly
 */
export async function resetDatabase(): Promise<void> {
  const db = getDatabase();
  
  console.log('[Database] 🔄 Resetting database...');
  
  try {
    await db.execAsync('BEGIN TRANSACTION');
    
    // Drop existing table
    await db.execAsync(`DROP TABLE IF EXISTS tasks`);
    console.log('[Database] Dropped tasks table');
    
    // Recreate with COMPLETE schema matching Supabase exactly
    await db.execAsync(`
      CREATE TABLE tasks (
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    `);
    
    await db.execAsync('COMMIT');
    console.log('[Database] ✅ Reset complete with complete Supabase-matching schema');
    
    // Verify structure
    const tableInfo = await db.getAllAsync<any>(`PRAGMA table_info(tasks)`);
    const columnNames = tableInfo.map((col: any) => col.name);
    console.log('[Database] 📋 Final table columns:', columnNames.join(', '));
  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('[Database] ❌ Error resetting database:', error);
    throw error;
  }
}
