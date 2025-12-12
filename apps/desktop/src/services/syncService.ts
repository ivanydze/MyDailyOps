/**
 * Sync service for desktop app
 * Handles bidirectional sync with Supabase
 * Desktop generates recurring task instances locally, matching mobile app behavior
 */

import { supabase, getCurrentUserId } from '../lib/supabaseClient';
import * as db from '../lib/db';
import type { Task } from '@mydailyops/core';

let isInitialized = false;
let isSyncing = false;
let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * Initialize sync service
 */
export async function init(): Promise<void> {
  if (isInitialized) return;

  try {
    await db.initDatabase();
    console.log('[Sync] Database initialized (or skipped in browser mode)');
    isInitialized = true;
  } catch (error) {
    console.warn('[Sync] Database init failed (may be browser mode):', error);
    // Don't throw - allow app to work in browser mode without SQLite
    isInitialized = true;
  }
}

/**
 * Pull all tasks from Supabase and merge with local cache
 * Matches mobile app's pullFromSupabase behavior
 */
export async function pullFromSupabase(userId: string): Promise<Task[]> {
  console.log('[Sync] Pulling tasks for user:', userId);

  try {
    // Load local tasks first (may be empty in browser mode)
    const localTasks = await db.loadTasksFromCache(userId);
    console.log(`[Sync] Loaded ${localTasks.length} local tasks from cache`);

    // Fetch tasks from Supabase (filter out soft-deleted tasks - Problem 13)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Sync] Error fetching from Supabase:', error);
      throw error;
    }

    // Map Supabase tasks to Task format
    const supabaseTasks: Task[] = (data || []).map((row: any) => {
      // Parse recurring_options JSON from Supabase
      let recurringOptions = null;
      if (row.recurring_options) {
        try {
          recurringOptions = typeof row.recurring_options === 'string'
            ? JSON.parse(row.recurring_options)
            : row.recurring_options;
        } catch (e) {
          console.error('[Sync] Error parsing recurring_options JSON:', e);
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
        pinned: row.pinned === true || row.pinned === 1 || row.pinned === '1',
        created_at: row.created_at,
        updated_at: row.updated_at,
        recurring_options: recurringOptions,
        is_completed: isCompleted,
        // Visibility fields (Problem 5)
        duration_days: row.duration_days ?? null,
        start_date: row.start_date ?? null,
        visible_from: row.visible_from ?? null,
        visible_until: row.visible_until ?? null,
        // Soft delete field (Problem 13)
        deleted_at: row.deleted_at ?? null,
      } as Task;
    });

    console.log(`[Sync] Fetched ${supabaseTasks.length} tasks from Supabase`);

    // Create a map of Supabase task IDs for fast lookup
    const supabaseTaskIds = new Set<string>();
    for (const task of supabaseTasks) {
      supabaseTaskIds.add(task.id);
    }

    console.log('[Sync] Merging local + Supabase tasks');

    // Merge logic:
    // 1. Update/insert all Supabase tasks (server is source of truth)
    for (const supabaseTask of supabaseTasks) {
      try {
        await db.upsertTaskToCache(supabaseTask);
      } catch (cacheError) {
        console.warn('[Sync] Could not cache task (browser mode?):', cacheError);
        // Continue even if caching fails
      }
    }

    // 2. Keep local-only tasks (tasks that don't exist in Supabase)
    // These are typically tasks created offline that haven't been pushed yet
    let keptLocalCount = 0;
    for (const localTask of localTasks) {
      if (!supabaseTaskIds.has(localTask.id)) {
        // This task only exists locally - keep it for push
        keptLocalCount++;
      }
    }

    if (keptLocalCount > 0) {
      console.log(`[Sync] Kept ${keptLocalCount} local-only tasks (will be pushed)`);
    }

    // Build merged tasks: Supabase tasks + local-only tasks
    const mergedTasks: Task[] = [...supabaseTasks];
    
    // Add local-only tasks that don't exist in Supabase
    for (const localTask of localTasks) {
      if (!supabaseTaskIds.has(localTask.id)) {
        mergedTasks.push(localTask);
      }
    }

    console.log(`[Sync] Merge complete: ${mergedTasks.length} total tasks (${supabaseTasks.length} from Supabase + ${localTasks.filter(t => !supabaseTaskIds.has(t.id)).length} local-only)`);

    return mergedTasks;
  } catch (error) {
    console.error('[Sync] Error pulling from Supabase:', error);
    throw error;
  }
}

/**
 * Push a single task to Supabase (upsert)
 * Matches mobile app's pushTaskToSupabase behavior
 */
export async function pushTaskToSupabase(task: Task): Promise<Task> {
  console.log('[Sync] Pushing task to Supabase:', task.id, 'Title:', task.title);

  try {
    // Stringify recurring_options JSON for Supabase
    const recurringOptionsJson = task.recurring_options
      ? (typeof task.recurring_options === 'string'
          ? task.recurring_options
          : JSON.stringify(task.recurring_options))
      : null;

    const { data, error } = await supabase
      .from('tasks')
      .upsert({
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        deadline: task.deadline,
        status: task.status,
        pinned: task.pinned,
        created_at: task.created_at,
        updated_at: task.updated_at,
        recurring: task.recurring_options ? true : false,
        recurring_options: recurringOptionsJson,
        // Visibility fields (Problem 5)
        duration_days: (task as any).duration_days ?? null,
        start_date: (task as any).start_date ?? null,
        visible_from: (task as any).visible_from ?? null,
        visible_until: (task as any).visible_until ?? null,
        // Soft delete field (Problem 13)
        deleted_at: (task as any).deleted_at ?? null,
        // Timezone-safe time fields (Problem 17)
        event_time: (task as any).event_time ?? null,
        event_timezone: (task as any).event_timezone ?? null,
      }, {
        onConflict: 'id'
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Sync] Supabase error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from Supabase upsert');
    }

    // Parse recurring_options JSON from response
    let recurringOptions = null;
    if (data.recurring_options) {
      try {
        recurringOptions = typeof data.recurring_options === 'string'
          ? JSON.parse(data.recurring_options)
          : data.recurring_options;
      } catch (e) {
        console.error('[Sync] Error parsing recurring_options from response:', e);
        recurringOptions = null;
      }
    }

    const isCompleted = data.status === 'done';

    // Map returned row to Task format
    const returnedTask: Task = {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      category: data.category,
      deadline: data.deadline,
      status: data.status,
      pinned: data.pinned === true || data.pinned === 1 || data.pinned === '1',
      created_at: data.created_at,
      updated_at: data.updated_at,
      recurring_options: recurringOptions,
      is_completed: isCompleted,
      // Timezone-safe time fields (Problem 17)
      event_time: data.event_time ?? null,
      event_timezone: data.event_timezone ?? null,
    } as any as Task;

    // Update local cache with server response
    await db.upsertTaskToCache(returnedTask);

    console.log('[Sync] Task pushed successfully:', task.id);
    return returnedTask;
  } catch (error) {
    console.error('[Sync] Error pushing task to Supabase:', error);
    throw error;
  }
}

/**
 * Push multiple tasks to Supabase in batch
 * More efficient for recurring instances
 */
export async function pushTasksToSupabaseBatch(tasks: Task[]): Promise<Task[]> {
  console.log('[Sync] Pushing batch of', tasks.length, 'tasks to Supabase');
  
  try {
    // Prepare tasks for Supabase
    const tasksToInsert = tasks.map(task => {
      const recurringOptionsJson = task.recurring_options
        ? (typeof task.recurring_options === 'string'
            ? task.recurring_options
            : JSON.stringify(task.recurring_options))
        : null;
      
      return {
        id: task.id,
        user_id: task.user_id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        deadline: task.deadline,
        status: task.status,
        pinned: task.pinned,
        created_at: task.created_at,
        updated_at: task.updated_at,
        recurring: task.recurring_options ? true : false,
        recurring_options: recurringOptionsJson,
        // Visibility fields (Problem 5)
        duration_days: (task as any).duration_days ?? null,
        start_date: (task as any).start_date ?? null,
        visible_from: (task as any).visible_from ?? null,
        visible_until: (task as any).visible_until ?? null,
        // Soft delete field (Problem 13)
        deleted_at: (task as any).deleted_at ?? null,
        // Timezone-safe time fields (Problem 17)
        event_time: (task as any).event_time ?? null,
        event_timezone: (task as any).event_timezone ?? null,
      };
    });

    const { data, error } = await supabase
      .from('tasks')
      .upsert(tasksToInsert, { onConflict: 'id' })
      .select('*');

    if (error) {
      console.error('[Sync] Batch insert error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from Supabase batch upsert');
    }

    // Map returned rows to Task format
    const returnedTasks: Task[] = data.map((row: any) => {
      let recurringOptions = null;
      if (row.recurring_options) {
        try {
          recurringOptions = typeof row.recurring_options === 'string'
            ? JSON.parse(row.recurring_options)
            : row.recurring_options;
        } catch (e) {
          console.error('[Sync] Error parsing recurring_options from response:', e);
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
        category: row.category || '',
        deadline: row.deadline,
        status: row.status,
        pinned: row.pinned === true || row.pinned === 1 || row.pinned === '1',
        created_at: row.created_at,
        updated_at: row.updated_at,
        recurring_options: recurringOptions,
        is_completed: isCompleted,
        // Visibility fields (Problem 5)
        duration_days: row.duration_days ?? null,
        start_date: row.start_date ?? null,
        visible_from: row.visible_from ?? null,
        visible_until: row.visible_until ?? null,
        // Soft delete field (Problem 13)
        deleted_at: row.deleted_at ?? null,
        // Timezone-safe time fields (Problem 17)
        event_time: row.event_time ?? null,
        event_timezone: row.event_timezone ?? null,
      } as Task;
    });

    // Update local cache with all returned tasks
    for (const returnedTask of returnedTasks) {
      try {
        await db.upsertTaskToCache(returnedTask);
      } catch (cacheError) {
        console.warn('[Sync] Could not cache task (browser mode?):', cacheError);
      }
    }

    console.log('[Sync] Batch push successful:', returnedTasks.length, 'tasks pushed');
    return returnedTasks;
  } catch (error) {
    console.error('[Sync] Error in batch push:', error);
    throw error;
  }
}

/**
 * Delete task from Supabase
 */
export async function deleteTaskFromSupabase(taskId: string, userId: string): Promise<void> {
  console.log('[Sync] Deleting task from Supabase:', taskId);

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    // Also delete from local cache (already verified user_id in Supabase query above)
    await db.deleteTaskFromCache(taskId, userId);

    console.log('[Sync] Task deleted successfully:', taskId);
  } catch (error) {
    console.error('[Sync] Error deleting task from Supabase:', error);
    throw error;
  }
}

/**
 * Push all local changes to Supabase
 * Push new tasks, updates, and deletes
 */
export async function pushToSupabase(userId: string): Promise<void> {
  console.log('[Sync] Pushing local changes to Supabase');

  try {
    const localTasks = await db.loadTasksFromCache(userId);

    // Get all tasks from Supabase to compare
    const { data: supabaseTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, updated_at')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const supabaseTaskMap = new Map<string, { updated_at: string }>();
    (supabaseTasks || []).forEach((task: any) => {
      supabaseTaskMap.set(task.id, { updated_at: task.updated_at });
    });

    // Push new or updated tasks
    for (const localTask of localTasks) {
      const supabaseTask = supabaseTaskMap.get(localTask.id);

      if (!supabaseTask) {
        // New task - push it
        console.log(`[Sync] Pushing new task: ${localTask.id}`);
        await pushTaskToSupabase(localTask);
      } else {
        // Existing task - check if local is newer
        const localUpdated = new Date(localTask.updated_at);
        const serverUpdated = new Date(supabaseTask.updated_at);

        if (localUpdated > serverUpdated) {
          // Local is newer - push it
          console.log(`[Sync] Pushing updated task: ${localTask.id}`);
          await pushTaskToSupabase(localTask);
        }
        // Else server is newer or same - will be handled by pull
      }
    }

    console.log('[Sync] Push complete');
  } catch (error) {
    console.error('[Sync] Error pushing to Supabase:', error);
    throw error;
  }
}

/**
 * Resolve conflicts between local and server
 * Strategy: server wins unless local has more recent updated_at
 */
async function resolveConflicts(userId: string): Promise<void> {
  console.log('[Sync] Resolving conflicts');

  try {
    const localTasks = await db.loadTasksFromCache(userId);

    // Fetch all server tasks
    const { data: serverTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const serverTaskMap = new Map<string, Task>();
    (serverTasks || []).forEach((row: any) => {
      let recurringOptions = null;
      if (row.recurring_options) {
        try {
          recurringOptions = typeof row.recurring_options === 'string'
            ? JSON.parse(row.recurring_options)
            : row.recurring_options;
        } catch (e) {
          recurringOptions = null;
        }
      }

      const task: Task = {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description || '',
        priority: row.priority,
        category: row.category,
        deadline: row.deadline,
        status: row.status,
        pinned: row.pinned === true || row.pinned === 1 || row.pinned === '1',
        created_at: row.created_at,
        updated_at: row.updated_at,
        recurring_options: recurringOptions,
        is_completed: row.status === 'done',
      };
      serverTaskMap.set(task.id, task);
    });

    // Resolve conflicts: server wins if server updated_at >= local updated_at
    for (const localTask of localTasks) {
      const serverTask = serverTaskMap.get(localTask.id);
      if (serverTask) {
        const localUpdated = new Date(localTask.updated_at);
        const serverUpdated = new Date(serverTask.updated_at);

        if (serverUpdated >= localUpdated) {
          // Server wins - update local
          await db.upsertTaskToCache(serverTask);
        } else {
          // Local is newer - will be pushed
          // Do nothing here, push will handle it
        }
      }
    }
  } catch (error) {
    console.error('[Sync] Error resolving conflicts:', error);
    throw error;
  }
}

/**
 * Full sync: pull from Supabase, push local changes, resolve conflicts
 * Also syncs weekly checklists
 * Problem 13: Also runs auto-purge for old deleted tasks
 */
export async function syncNow(): Promise<Task[]> {
  if (isSyncing) {
    console.log('[Sync] Sync already in progress, skipping');
    return [];
  }

  // Don't sync if offline
  if (!isOnline) {
    console.log('[Sync] Device is offline, skipping sync');
    return [];
  }

  isSyncing = true;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('[Sync] Not authenticated, skipping sync');
      isSyncing = false;
      return [];
    }

    console.log('[Sync] Starting full sync for user:', userId);

    // 1. Push local changes first
    await pushToSupabase(userId);

    // 2. Resolve conflicts
    await resolveConflicts(userId);

    // 3. Pull from Supabase (gets latest server state)
    const tasks = await pullFromSupabase(userId);

    // 4. Sync weekly checklists (Problem 10)
    try {
      const { syncWeeklyChecklists } = await import('./syncWeeklyChecklists');
      await syncWeeklyChecklists(userId);
      console.log('[Sync] Weekly checklists synced');
    } catch (checklistError) {
      console.warn('[Sync] Weekly checklist sync failed (non-critical):', checklistError);
      // Don't throw - tasks sync is more critical
    }

    // 5. Sync travel events (Problem 16)
    try {
      const { syncTravelEvents } = await import('./syncTravelEvents');
      await syncTravelEvents(userId);
      console.log('[Sync] Travel events synced');
    } catch (travelError) {
      console.warn('[Sync] Travel events sync failed (non-critical):', travelError);
      // Don't throw - tasks sync is more critical
    }

    // 6. Problem 13: Auto-purge old deleted tasks (30+ days old)
    try {
      const { autoPurgeTrash } = await import('../lib/dbTrash');
      const purgedCount = await autoPurgeTrash(userId, 30);
      if (purgedCount > 0) {
        console.log(`[Sync] Auto-purged ${purgedCount} old tasks from Trash`);
      }
    } catch (purgeError) {
      console.warn('[Sync] Auto-purge failed (non-critical):', purgeError);
      // Don't throw - tasks sync is more critical
    }

    console.log('[Sync] Full sync completed successfully, fetched', tasks.length, 'tasks');
    return tasks;
  } catch (error) {
    console.error('[Sync] Full sync failed:', error);
    throw error;
  } finally {
    isSyncing = false;
  }
}

/**
 * Start auto-polling for sync (every 45 seconds)
 * Problem 18: Desktop Real-time Sync - Auto-polling fallback
 */
export function startAutoPolling(syncCallback: () => Promise<void>, intervalMs: number = 45000): void {
  if (pollingIntervalId) {
    console.log('[Sync] Auto-polling already started');
    return;
  }

  console.log(`[Sync] Starting auto-polling every ${intervalMs / 1000} seconds`);
  
  pollingIntervalId = setInterval(async () => {
    if (!isOnline || isSyncing) {
      console.log('[Sync] Skipping auto-poll: offline or already syncing');
      return;
    }

    try {
      await syncCallback();
    } catch (error) {
      console.error('[Sync] Auto-poll sync failed:', error);
    }
  }, intervalMs);
}

/**
 * Stop auto-polling
 */
export function stopAutoPolling(): void {
  if (pollingIntervalId) {
    console.log('[Sync] Stopping auto-polling');
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

/**
 * Get current online status
 */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/**
 * Set online status (called by event listeners)
 */
export function setOnlineStatus(online: boolean): void {
  const wasOffline = !isOnline;
  isOnline = online;
  
  if (wasOffline && online) {
    console.log('[Sync] Device came online');
  } else if (!wasOffline && !online) {
    console.log('[Sync] Device went offline');
  }
}

