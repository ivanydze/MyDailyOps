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

    // Fetch tasks from Supabase
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
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
        console.log(`[Sync] Deleting local task not found in Supabase: ${localTask.id} (${localTask.title})`);
        await deleteTaskFromCache(localTask.id);
        deletedCount++;
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
    };

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
      };
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
