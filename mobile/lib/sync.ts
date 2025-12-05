import { supabase, getCurrentUserId } from './supabase';
import {
  loadTasksFromCache,
  upsertTaskToCache,
  replaceAllTasksInCache,
} from '../database/init';
import { Task } from '../types/task';

/**
 * Pull all tasks from Supabase for current user and replace local cache
 */
export async function pullFromSupabase(userId: string): Promise<Task[]> {
  console.log('[Sync] Pulling tasks for user:', userId);

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const tasks: Task[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description || '',
      priority: row.priority,
      category: row.category,
      deadline: row.deadline,
      status: row.status,
      pinned: row.pinned || false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    // Replace entire local cache with server data
    await replaceAllTasksInCache(userId, tasks);

    console.log(`[Sync] Pulled ${tasks.length} tasks from Supabase`);
    return tasks;
  } catch (error) {
    console.error('[Sync] Error pulling from Supabase:', error);
    throw error;
  }
}

/**
 * Push a single task to Supabase (upsert)
 */
export async function pushTaskToSupabase(task: Task): Promise<void> {
  console.log('[Sync] Pushing task to Supabase:', task.id);

  try {
    const { error } = await supabase
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
      });

    if (error) throw error;

    console.log('[Sync] Task pushed successfully:', task.id);
  } catch (error) {
    console.error('[Sync] Error pushing task to Supabase:', error);
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
