import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types/task';
import {
  loadTasksFromCache,
  upsertTaskToCache,
  deleteTaskFromCache,
} from '../database/init';
import { syncNow, pushTaskToSupabase, deleteTaskFromSupabase } from '../lib/sync';
import { useAuth } from '../contexts/AuthContext';
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
      setLoading(true);
      setError(null);
      const cachedTasks = await loadTasksFromCache(userId);
      setTasks(cachedTasks);
      console.log(`[useSync] Loaded ${cachedTasks.length} tasks from cache`);
    } catch (err) {
      console.error('[useSync] Error loading tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
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
      const newTask: Task = {
        ...taskData,
        id: generateUUID(),
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      console.log('[useSync] Adding task:', newTask.id);

      // Save to local cache immediately
      await upsertTaskToCache(newTask);

      // Refresh local view
      await refreshTasks();

      // Push to Supabase in background (only if authenticated)
      if (isAuthenticated) {
        pushTaskToSupabase(newTask).catch((err) => {
          console.error('[useSync] Background push failed:', err);
          setError('Task saved locally. Will sync later.');
        });
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
      const updatedTask = {
        ...task,
        updated_at: new Date().toISOString(),
      };

      console.log('[useSync] Updating task:', updatedTask.id);

      // Update local cache immediately
      await upsertTaskToCache(updatedTask);

      // Refresh local view
      await refreshTasks();

      // Push to Supabase in background (only if authenticated)
      if (isAuthenticated) {
        pushTaskToSupabase(updatedTask).catch((err) => {
          console.error('[useSync] Background push failed:', err);
          setError('Changes saved locally. Will sync later.');
        });
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
      return;
    }

    if (!userId) {
      console.log('[useSync] No userId, clearing tasks');
      setTasks([]);
      setLoading(false);
      return;
    }

    // Load from cache first
    refreshTasks().then(() => {
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
  }, [isAuthenticated, userId, authLoading]);

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
