import { supabase, getCurrentUserId } from './supabase';
import {
  loadTasksFromCache,
  upsertTaskToCache,
  deleteTaskFromCache,
} from '../database/init';
import { Task } from '../types/task';

/**
 * Pull all tasks from Supabase for current user and merge with local cache
 * Deletes local tasks that no longer exist on Supabase (ensures sync with deletions)
 */
export async function pullFromSupabase(userId: string): Promise<Task[]> {
  console.log('[Sync] Pulling tasks for user:', userId);

  try {
    // Load local tasks first
    const localTasks = await loadTasksFromCache(userId);
    console.log(`[Sync] Loaded ${localTasks.length} local tasks from cache`);

    // Fetch tasks from Supabase (filter out soft-deleted tasks - Problem 13)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Map Supabase tasks to Task format
    const supabaseTasks: Task[] = (data || []).map((row: any) => {
      // Parse recurring_options JSON from Supabase
      let recurringOptions = null;
      if (row.recurring_options) {
        try {
          // Supabase may return JSON string or already parsed object
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
        category: row.category,
        deadline: row.deadline,
        status: row.status,
        pinned: row.pinned === true || row.pinned === 1 || row.pinned === '1',
        created_at: row.created_at,
        updated_at: row.updated_at,
        // 🔥 Recurring options - parse from JSON
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
      };
    });

    console.log(`[Sync] Fetched ${supabaseTasks.length} tasks from Supabase`);

    // Create a map of Supabase task IDs for fast lookup
    const supabaseTaskIds = new Set<string>();
    for (const task of supabaseTasks) {
      supabaseTaskIds.add(task.id);
    }

    console.log('[Sync] Merging local + Supabase tasks');

    // Merge logic:
    // 1. Update/insert all Supabase tasks (server is source of truth for tasks that exist there)
    for (const supabaseTask of supabaseTasks) {
      await upsertTaskToCache(supabaseTask);
    }

    // 2. Delete local tasks that no longer exist on Supabase
    // This ensures that tasks deleted on Desktop/Supabase are also removed from Mobile
    let deletedCount = 0;
    for (const localTask of localTasks) {
      if (!supabaseTaskIds.has(localTask.id)) {
        // This task exists locally but not on Supabase - delete it
        // SECURITY: Verify task belongs to user before deleting
        if (localTask.user_id === userId) {
          console.log(`[Sync] Deleting local task not found in Supabase: ${localTask.id} (${localTask.title})`);
          await deleteTaskFromCache(localTask.id, userId);
          deletedCount++;
        } else {
          console.warn('[Sync] SECURITY: Skipping task belonging to another user during sync:', localTask.id);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[Sync] Deleted ${deletedCount} local task(s) that were removed from Supabase`);
    }

    // Reload merged tasks from cache
    const mergedTasks = await loadTasksFromCache(userId);
    console.log(`[Sync] Merge complete: ${mergedTasks.length} total tasks (${supabaseTasks.length} from Supabase, ${deletedCount} deleted locally)`);

    return mergedTasks;
  } catch (error) {
    console.error('[Sync] Error pulling from Supabase:', error);
    throw error;
  }
}

/**
 * Push a single task to Supabase (upsert)
 * Returns the updated task from Supabase with all fields
 */
export async function pushTaskToSupabase(task: Task): Promise<Task> {
  console.log('[Sync] Pushing task to Supabase:', task.id);

  try {
    // Stringify recurring_options JSON for Supabase
    // Supabase handles JSON automatically, but we ensure it's a proper JSON string
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
        // 🔥 Recurring: set to true if recurring_options exists
        recurring: task.recurring_options ? true : false,
        // 🔥 Recurring options MUST be pushed to Supabase as JSON
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
      })
      .select('*')
      .single();

    if (error) throw error;

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
    
    // Compute is_completed from status
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
      // 🔥 Map recurring options from Supabase response
      recurring_options: recurringOptions,
      is_completed: isCompleted,
      // Visibility fields (Problem 5)
      duration_days: data.duration_days ?? null,
      start_date: data.start_date ?? null,
      visible_from: data.visible_from ?? null,
      visible_until: data.visible_until ?? null,
      // Soft delete field (Problem 13)
      deleted_at: data.deleted_at ?? null,
      // Timezone-safe time fields (Problem 17)
      event_time: data.event_time ?? null,
      event_timezone: data.event_timezone ?? null,
    } as Task;

    console.log('[Sync] Task pushed successfully:', task.id);
    return returnedTask;
  } catch (error) {
    console.error('[Sync] Error pushing task to Supabase:', error);
    throw error;
  }
}

/**
 * Push multiple tasks to Supabase in a single batch operation (upsert)
 */
export async function pushTasksToSupabaseBatch(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) {
    return [];
  }
  console.log(`[Sync] Pushing batch of ${tasks.length} tasks to Supabase`);

  try {
    const formattedTasks = tasks.map(task => {
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
      .upsert(formattedTasks)
      .select('*');

    if (error) throw error;

    if (!data) {
      throw new Error('No data returned from Supabase batch upsert');
    }

    const returnedTasks: Task[] = data.map((row: any) => {
      let recurringOptions = null;
      if (row.recurring_options) {
        try {
          recurringOptions = typeof row.recurring_options === 'string'
            ? JSON.parse(row.recurring_options)
            : row.recurring_options;
        } catch (e) {
          console.error('[Sync] Error parsing recurring_options from batch response:', e);
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

    // Update local cache with server responses
    for (const task of returnedTasks) {
      await upsertTaskToCache(task);
    }

    console.log(`[Sync] Batch push successful: ${returnedTasks.length} tasks pushed`);
    return returnedTasks;
  } catch (error) {
    console.error('[Sync] Error pushing tasks in batch to Supabase:', error);
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

    console.log('[Sync] Task deleted successfully:', taskId);
  } catch (error) {
    console.error('[Sync] Error deleting task from Supabase:', error);
    throw error;
  }
}

/**
 * Full sync: pull all tasks from Supabase
 * Also syncs weekly checklists (Problem 10)
 * Returns tasks from cache if sync fails
 */
export async function syncNow(): Promise<Task[]> {
  console.log('[Sync] Starting full sync...');

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn('[Sync] Not authenticated, returning empty array');
      return [];
    }

    console.log('[Sync] Authenticated as user:', userId);

    // Pull all tasks from server (replaces local cache)
    const tasks = await pullFromSupabase(userId);

    // Sync weekly checklists (Problem 10)
    try {
      const { syncWeeklyChecklists } = await import('./syncWeeklyChecklists');
      await syncWeeklyChecklists(userId);
      console.log('[Sync] Weekly checklists synced');
    } catch (checklistError) {
      console.warn('[Sync] Weekly checklist sync failed (non-critical):', checklistError);
      // Don't throw - tasks sync is more critical
    }

    // Sync travel events (Problem 16)
    try {
      const { syncTravelEvents } = await import('./syncTravelEvents');
      await syncTravelEvents(userId);
      console.log('[Sync] Travel events synced');
    } catch (travelError) {
      console.warn('[Sync] Travel events sync failed (non-critical):', travelError);
      // Don't throw - tasks sync is more critical
    }

    // Problem 13: Auto-purge old deleted tasks (30+ days old)
    try {
      const { autoPurgeTrash } = await import('../database/dbTrash');
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
    
    // If sync fails, try to return local cache
    const userId = await getCurrentUserId();
    if (userId) {
      const cachedTasks = await loadTasksFromCache(userId);
      console.log('[Sync] Returning', cachedTasks.length, 'cached tasks');
      return cachedTasks;
    }
    
    return [];
  }
}
