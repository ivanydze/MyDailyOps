import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';
import {
  loadTasksFromCache,
  upsertTaskToCache,
  deleteTaskFromCache,
  getTaskById,
} from '../database/init';
import { syncNow, pushTaskToSupabase, pushTasksToSupabaseBatch, deleteTaskFromSupabase } from '../lib/sync';
import { useAuth } from '../contexts/AuthContext';
import { 
  generateRecurringInstances, 
  deleteFutureInstances, 
  applyRecurringConfig,
  isRecurringTemplate,
  findAllInstancesFromTemplate,
  deleteAllInstances,
  ensureActiveOccurrence,
} from '../utils/recurring';
import { Alert } from 'react-native';
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
      let cachedTasks = await loadTasksFromCache(userId);
      console.log(`[useSync] Loaded ${cachedTasks.length} tasks from cache`);
      
      // PROBLEM 2: Ensure active occurrences for all recurring templates
      // Check and create active occurrences if needed (prevents overlap)
      const templates = cachedTasks.filter(t => isRecurringTemplate(t));
      for (const template of templates) {
        try {
          await ensureActiveOccurrence(template, cachedTasks);
          // Reload tasks to get newly created occurrences
          cachedTasks = await loadTasksFromCache(userId);
        } catch (error) {
          console.error(`[useSync] Error ensuring active occurrence for template ${template.id}:`, error);
        }
      }
      
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
      
      // Calculate visibility (Problem 5: Deadline-anchored duration)
      const { calculateVisibility } = await import('../utils/visibility');
      const durationDays = (taskData as any).duration_days ?? null;
      const startDate = (taskData as any).start_date ?? null;
      const visibility = calculateVisibility(taskData.deadline, durationDays, startDate);

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
        // Add visibility fields
        duration_days: durationDays,
        start_date: startDate,
        visible_from: visibility.visible_from,
        visible_until: visibility.visible_until,
      } as Task;

      console.log('[useSync] Adding task:', newTask.id);

      // Save template task to local cache immediately
      await upsertTaskToCache(newTask);

      // PROBLEM 2: For recurring tasks, ensure active occurrence instead of pre-generating all
      if (newTask.recurring_options && newTask.recurring_options.type !== 'none') {
        console.log('[useSync] Ensuring active occurrence for recurring task:', newTask.id);
        
        // Load current tasks to check for existing occurrences
        const currentTasks = await loadTasksFromCache(userId);
        const activeOccurrence = await ensureActiveOccurrence(newTask, currentTasks);
        
        // Prepare tasks to push (template + active occurrence if created)
        const tasksToPush = [newTask];
        if (activeOccurrence) {
          tasksToPush.push(activeOccurrence);
        }
        
        // Refresh from cache immediately to ensure state matches cache
        await refreshTasks();
        
        // Push template + active occurrence to Supabase in batch (only if authenticated)
        if (isAuthenticated) {
          try {
            await pushTasksToSupabaseBatch(tasksToPush);
            console.log('[useSync] Template + active occurrence pushed to Supabase successfully');
            
            // Refresh after a delay to allow Supabase to process inserts
            setTimeout(async () => {
              await refreshTasks();
            }, 2000);
          } catch (error) {
            console.error('[useSync] Error pushing tasks to Supabase:', error);
            setError('Tasks saved locally. Will sync later.');
          }
        }
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

    // SECURITY: Verify task belongs to current user before updating
    if (task.user_id !== userId) {
      console.error('[useSync] SECURITY: Attempt to update task belonging to another user:', task.id);
      throw new Error('Access denied: Cannot update tasks belonging to other users');
    }

    // PROBLEM 9: Prevent completing recurring templates
    if (task.status === 'done' && isRecurringTemplate(task)) {
      throw new Error('Cannot complete recurring template. Only occurrences can be completed.');
    }

    try {
      // Recalculate visibility if deadline, duration_days, or start_date changed (Problem 5 & 11)
      const { calculateVisibility } = await import('../utils/visibility');
      const durationDays = (task as any).duration_days ?? null;
      const startDate = (task as any).start_date ?? null;
      const visibility = calculateVisibility(task.deadline, durationDays, startDate);
      
      // Update task with recalculated visibility
      const taskWithVisibility = {
        ...task,
        duration_days: durationDays,
        start_date: startDate,
        visible_from: visibility.visible_from,
        visible_until: visibility.visible_until,
      };

      // Verify task exists and belongs to user
      const existingTask = await getTaskById(task.id, userId);
      if (!existingTask) {
        throw new Error('Task not found or access denied');
      }

      // Apply recurring config with defaults if recurring
      const taskWithConfig = applyRecurringConfig(taskWithVisibility, task.recurring_options || null);

      const updatedTask: Task = {
        ...taskWithConfig,
        updated_at: new Date().toISOString(),
        is_completed: task.status === 'done',
        // Ensure visibility fields are included
        duration_days: durationDays,
        start_date: startDate,
        visible_from: visibility.visible_from,
        visible_until: visibility.visible_until,
      } as Task;

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

      // PROBLEM 2: For recurring tasks, ensure active occurrence instead of pre-generating all
      if (isRecurring) {
        console.log('[useSync] Ensuring active occurrence for updated recurring task');
        
        // Load current tasks to check for existing occurrences
        const currentTasks = await loadTasksFromCache(userId);
        const activeOccurrence = await ensureActiveOccurrence(updatedTask, currentTasks);
        
        // Prepare tasks to push (template + active occurrence if created)
        const tasksToPush = [updatedTask];
        if (activeOccurrence) {
          tasksToPush.push(activeOccurrence);
        }
        
        // Refresh from cache immediately to ensure state matches cache
        await refreshTasks();
        
        // Push template + active occurrence to Supabase in batch (only if authenticated)
        if (isAuthenticated) {
          try {
            await pushTasksToSupabaseBatch(tasksToPush);
            console.log('[useSync] Template + active occurrence pushed to Supabase successfully');
            
            // Refresh after a delay to allow Supabase to process inserts
            setTimeout(async () => {
              await refreshTasks();
            }, 2000);
          } catch (error) {
            console.error('[useSync] Error pushing tasks to Supabase:', error);
            setError('Changes saved locally. Will sync later.');
          }
        }
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
   * Handles recurring tasks: if template is deleted, all instances are deleted too
   */
  const deleteTask = useCallback(async (taskId: string) => {
    if (!userId) {
      console.error('[useSync] Cannot delete task - no userId');
      return;
    }

    try {
      console.log('[useSync] Deleting task:', taskId);
      
      // SECURITY: Load the task and verify it belongs to current user
      const taskToDelete = await getTaskById(taskId, userId);
      if (!taskToDelete) {
        console.warn('[useSync] Task not found or access denied:', taskId);
        throw new Error('Task not found or access denied');
      }

      // Additional security check: verify user_id matches
      if (taskToDelete.user_id !== userId) {
        console.error('[useSync] SECURITY: Attempt to delete task belonging to another user:', taskId);
        throw new Error('Access denied: Cannot delete tasks belonging to other users');
      }

      const tasksToDelete: string[] = [taskId]; // Always delete the requested task
      
      // Check if this is a recurring template
      if (isRecurringTemplate(taskToDelete)) {
        console.log('[useSync] Task is a recurring template, deleting all instances');
        
        // Find and delete all instances
        const allTasks = await loadTasksFromCache(userId);
        const instances = findAllInstancesFromTemplate(taskToDelete, allTasks);
        
        for (const instance of instances) {
          // SECURITY: Verify instance belongs to user before deleting
          if (instance.user_id === userId) {
            tasksToDelete.push(instance.id);
            await deleteTaskFromCache(instance.id, userId);
          } else {
            console.warn('[useSync] SECURITY: Skipping instance belonging to another user:', instance.id);
          }
        }
        
        // Delete the template
        await deleteTaskFromCache(taskId, userId);
        
        console.log(`[useSync] Deleted template + ${instances.length} instances`);
      } else {
        // Regular task or instance - delete only this task
        await deleteTaskFromCache(taskId, userId);
        console.log('[useSync] Deleted single task (non-template)');
      }

      // Refresh local view
      await refreshTasks();

      // Delete from Supabase in background (only if authenticated)
      if (isAuthenticated) {
        // Delete all tasks in parallel
        Promise.all(
          tasksToDelete.map(taskId => 
            deleteTaskFromSupabase(taskId, userId).catch((err) => {
              console.error(`[useSync] Failed to delete task ${taskId} from Supabase:`, err);
            })
          )
        ).catch((err) => {
          console.error('[useSync] Some deletions failed:', err);
          setError('Some deletions saved locally. Will sync later.');
        });
      }
    } catch (err) {
      console.error('[useSync] Error deleting task:', err);
      throw err;
    }
  }, [userId, isAuthenticated, refreshTasks]);

  /**
   * Toggle task status between pending and done
   * PROBLEM 9: Prevent completing recurring templates
   */
  const toggleTaskStatus = useCallback(async (task: Task) => {
    try {
      // PROBLEM 9: Prevent completing recurring templates
      if (isRecurringTemplate(task)) {
        Alert.alert(
          'Cannot Complete Template',
          'Recurring templates cannot be completed. Only occurrences can be completed.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const newStatus = task.status === 'done' ? 'pending' : 'done';
      console.log('[useSync] Toggling task status:', task.id, newStatus);
      await updateTask({ ...task, status: newStatus });
    } catch (err: any) {
      // Handle error from updateTask (template completion attempt)
      if (err?.message && err.message.includes('Cannot complete recurring template')) {
        Alert.alert('Error', err.message, [{ text: 'OK' }]);
      } else {
        console.error('[useSync] Error toggling status:', err);
        throw err;
      }
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
