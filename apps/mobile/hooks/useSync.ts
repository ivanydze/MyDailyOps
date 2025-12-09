import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';
import {
  loadTasksFromCache,
  upsertTaskToCache,
  deleteTaskFromCache,
} from '../database/init';
import { syncNow, pushTaskToSupabase, pushTasksToSupabaseBatch, deleteTaskFromSupabase } from '../lib/sync';
import { useAuth } from '../contexts/AuthContext';
import { generateRecurringInstances, deleteFutureInstances, applyRecurringConfig } from '../utils/recurring';
import * as Crypto from 'expo-crypto';

export interface UseSyncReturn {
  tasks: Task[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  syncTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskStatus: (task: Task) => Promise<void>;
}

/**
 * Hook for managing tasks with offline-first architecture
 * Single ID system matching Supabase exactly
 */
export function useSync(): UseSyncReturn {
  const { userId, isAuthenticated, loading: authLoading } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate UUID v4
   */
  const generateUUID = (): string => {
    return Crypto.randomUUID();
  };

  /**
   * Load tasks from local cache
   */
  const refreshTasks = useCallback(async () => {
    if (!userId) {
      console.log('[useSync] No userId, skipping refresh');
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      console.log('[useSync] Refreshing tasks from cache for user:', userId);
      // Don't set loading to true here - it causes UI flash and might hide tasks
      // Only set loading for initial load, not for refreshes after mutations
      setError(null);
      const cachedTasks = await loadTasksFromCache(userId);
      console.log(`[useSync] Loaded ${cachedTasks.length} tasks from cache`);
      
      // Log breakdown for debugging
      const withDeadlines = cachedTasks.filter(t => t.deadline);
      const futureTasks = cachedTasks.filter(t => t.deadline && new Date(t.deadline) > new Date());
      console.log(`[useSync] Tasks breakdown: ${withDeadlines.length} with deadlines, ${futureTasks.length} future`);
      
      setTasks(cachedTasks);
    } catch (err) {
      console.error('[useSync] Error loading tasks:', err);
      setError('Failed to load tasks');
    }
  }, [userId]);

  /**
   * Sync with Supabase (pull all tasks)
   */
  const syncTasks = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      console.log('[useSync] Skipping sync - not authenticated');
      return;
    }

    try {
      console.log('[useSync] Starting sync for user:', userId);
      setSyncing(true);
      setError(null);
      
      const syncedTasks = await syncNow();
      setTasks(syncedTasks);
      console.log('[useSync] Sync completed successfully');
    } catch (err: any) {
      console.error('[useSync] Error syncing tasks:', err);
      setError('Sync failed. Using cached data.');
    } finally {
      setSyncing(false);
    }
  }, [isAuthenticated, userId]);

  /**
   * Add new task (offline-first with UUID)
   */
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) {
      console.error('[useSync] Cannot add task - no userId');
      return;
    }

    try {
      const now = new Date().toISOString();
      
      // Apply recurring config with defaults
      const taskWithConfig = applyRecurringConfig(
        { ...taskData, id: '', user_id: userId, created_at: now, updated_at: now } as Task,
        taskData.recurring_options || null
      );

      const newTask: Task = {
        ...taskWithConfig,
        id: generateUUID(),
        user_id: userId,
        created_at: now,
        updated_at: now,
        is_completed: taskData.status === 'done',
      };

      console.log('[useSync] Adding task:', newTask.id);

      // Save template task to local cache immediately
      await upsertTaskToCache(newTask);

      // Generate recurring instances if this is a recurring task
      if (newTask.recurring_options && newTask.recurring_options.type !== 'none') {
        console.log('[useSync] Generating recurring instances for task:', newTask.id);
        const instances = await generateRecurringInstances(newTask);
        console.log('[useSync] Generated', instances.length, 'instances');
        
        // All instances are now saved to cache by generateRecurringInstances
        // Refresh from cache immediately to ensure state matches cache (includes all instances)
        await refreshTasks();
        
        // Push template + all instances to Supabase in batch (only if authenticated)
        if (isAuthenticated) {
          try {
            const allTasksToPush = [newTask, ...instances];
            await pushTasksToSupabaseBatch(allTasksToPush);
            console.log('[useSync] Template + all instances pushed to Supabase successfully');
            
            // Refresh after a delay to allow Supabase to process all inserts and merge any changes
            setTimeout(async () => {
              await refreshTasks();
            }, 2000);
          } catch (error) {
            console.error('[useSync] Error pushing tasks to Supabase:', error);
            setError('Tasks saved locally. Will sync later.');
            // State already refreshed above, so UI already shows all instances
          }
        }
        // If not authenticated, state was already refreshed above
      } else {
        // Not a recurring task
        // Refresh local view
        await refreshTasks();

        // Push to Supabase in background (only if authenticated)
        if (isAuthenticated) {
          pushTaskToSupabase(newTask)
            .then((returnedTask) => {
              // Update local cache with returned task from Supabase (includes all recurring fields)
              console.log('[useSync] Updating cache with Supabase response for task:', returnedTask.id);
              upsertTaskToCache(returnedTask)
                .then(() => refreshTasks())
                .catch((err) => console.error('[useSync] Error updating cache after push:', err));
            })
            .catch((err) => {
              console.error('[useSync] Background push failed:', err);
              setError('Task saved locally. Will sync later.');
            });
        }
      }
    } catch (err) {
      console.error('[useSync] Error adding task:', err);
      throw err;
    }
  }, [userId, isAuthenticated, refreshTasks]);

  /**
   * Update existing task (offline-first)
   */
  const updateTask = useCallback(async (task: Task) => {
    if (!userId) {
      console.error('[useSync] Cannot update task - no userId');
      return;
    }

    try {
      // Apply recurring config with defaults if recurring
      const taskWithConfig = applyRecurringConfig(task, task.recurring_options || null);

      const updatedTask: Task = {
        ...taskWithConfig,
        updated_at: new Date().toISOString(),
        is_completed: task.status === 'done',
      };

      console.log('[useSync] Updating task:', updatedTask.id);

      // Check if this is a recurring task - if so, handle instance regeneration
      const isRecurring = updatedTask.recurring_options && updatedTask.recurring_options.type !== 'none';
      
      if (isRecurring) {
        // Delete all future instances before updating template
        console.log('[useSync] Deleting future instances for recurring task');
        await deleteFutureInstances(updatedTask);
      }

      // Update template task in local cache immediately
      await upsertTaskToCache(updatedTask);

      // Regenerate future instances if recurring
      if (isRecurring) {
        console.log('[useSync] Regenerating recurring instances for task:', updatedTask.id);
        const instances = await generateRecurringInstances(updatedTask);
        console.log('[useSync] Generated', instances.length, 'instances');
        
        // All instances are now saved to cache by generateRecurringInstances
        // Refresh from cache immediately to ensure state matches cache (includes all instances)
        await refreshTasks();
        
        // Push template + all instances to Supabase in batch (only if authenticated)
        if (isAuthenticated) {
          try {
            const allTasksToPush = [updatedTask, ...instances];
            await pushTasksToSupabaseBatch(allTasksToPush);
            console.log('[useSync] Template + all instances pushed to Supabase successfully');
            
            // Refresh after a delay to allow Supabase to process all inserts and merge any changes
            setTimeout(async () => {
              await refreshTasks();
            }, 2000);
          } catch (error) {
            console.error('[useSync] Error pushing tasks to Supabase:', error);
            setError('Changes saved locally. Will sync later.');
            // State already refreshed above, so UI already shows all instances
          }
        }
        // If not authenticated, state was already refreshed above
      } else {
        // Not a recurring task
        // Refresh local view
        await refreshTasks();

        // Push to Supabase in background (only if authenticated)
        if (isAuthenticated) {
          pushTaskToSupabase(updatedTask)
            .then((returnedTask) => {
              // Update local cache with returned task from Supabase (includes all recurring fields)
              console.log('[useSync] Updating cache with Supabase response for task:', returnedTask.id);
              upsertTaskToCache(returnedTask)
                .then(() => refreshTasks())
                .catch((err) => console.error('[useSync] Error updating cache after push:', err));
            })
            .catch((err) => {
              console.error('[useSync] Background push failed:', err);
              setError('Changes saved locally. Will sync later.');
            });
        }
      }
    } catch (err) {
      console.error('[useSync] Error updating task:', err);
      throw err;
    }
  }, [userId, isAuthenticated, refreshTasks]);

  /**
   * Delete task (offline-first)
   */
  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      console.error('[useSync] Cannot delete task - no userId');
      return;
    }

    try {
      console.log('[useSync] Deleting task:', taskId);
      
      // Delete from local cache immediately
      await deleteTaskFromCache(taskId);

      // Refresh local view
      await refreshTasks();

      // Delete from Supabase in background (only if authenticated)
      if (isAuthenticated) {
        deleteTaskFromSupabase(taskId, userId).catch((err) => {
          console.error('[useSync] Background delete failed:', err);
          setError('Deletion saved locally. Will sync later.');
        });
      }
    } catch (err) {
      console.error('[useSync] Error deleting task:', err);
      throw err;
    }
  }, [userId, isAuthenticated, refreshTasks]);

  /**
   * Toggle task status between pending and done
   */
  const toggleTaskStatus = useCallback(async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'pending' : 'done';
      console.log('[useSync] Toggling task status:', task.id, newStatus);
      await updateTask({ ...task, status: newStatus });
    } catch (err) {
      console.error('[useSync] Error toggling status:', err);
      throw err;
    }
  }, [updateTask]);

  /**
   * Load tasks on mount and sync when authenticated
   */
  useEffect(() => {
    console.log('[useSync] Auth state changed:', { isAuthenticated, userId, authLoading });
    
    if (authLoading) {
      console.log('[useSync] Waiting for auth to load...');
      setLoading(true);
      return;
    }

    if (!userId) {
      console.log('[useSync] No userId, clearing tasks');
      setTasks([]);
      setLoading(false);
      return;
    }

    // Load from cache first (set loading only for initial mount)
    setLoading(true);
    refreshTasks().then(() => {
      setLoading(false);
      // Then sync if authenticated
      if (isAuthenticated) {
        console.log('[useSync] Authenticated, starting initial sync...');
        syncTasks().catch(() => {
          console.log('[useSync] Initial sync failed, using cached data');
        });
      } else {
        console.log('[useSync] Not authenticated, using cached data only');
      }
    });
  }, [isAuthenticated, userId, authLoading, refreshTasks, syncTasks]);

  return {
    tasks,
    loading,
    syncing,
    error,
    refreshTasks,
    syncTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
  };
}
