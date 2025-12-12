import { create } from "zustand";
import type { Task } from "@mydailyops/core";
import * as db from "../lib/db";
import * as dbTrash from "../lib/dbTrash";
import { getCurrentUserId, supabase } from "../lib/supabaseClient";
import { pushTaskToSupabase, pushTasksToSupabaseBatch, deleteTaskFromSupabase, syncNow } from "../services/syncService";
import { 
  deleteFutureInstances, 
  applyRecurringConfig,
  isRecurringTemplate,
  findAllInstancesFromTemplate,
  ensureActiveOccurrence,
} from "../utils/recurring";
import { calculateVisibility } from "../utils/visibility";

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  // Soft delete functions (Problem 13)
  softDeleteTask: (id: string) => Promise<void>;
  softDeleteAllTasks: () => Promise<number>;
  restoreTask: (id: string) => Promise<void>;
  hardDeleteTask: (id: string) => Promise<void>;
  emptyTrash: () => Promise<number>;
  sync: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        set({ tasks: [], isLoading: false });
        return;
      }
      
      // Try to load from cache first
      let tasks = await db.loadTasksFromCache(userId);
      
      // If cache is empty (browser mode or no local data), fetch from Supabase
      if (tasks.length === 0) {
        console.log('[TaskStore] Cache empty, fetching from Supabase...');
        // Filter out soft-deleted tasks (Problem 13)
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        // Map Supabase tasks to Task format
        tasks = (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          description: row.description || '',
          priority: row.priority,
          category: row.category || '',
          deadline: row.deadline,
          status: row.status,
          pinned: row.pinned || false,
          created_at: row.created_at,
          updated_at: row.updated_at,
          recurring_options: row.recurring_options ? (typeof row.recurring_options === 'string' ? JSON.parse(row.recurring_options) : row.recurring_options) : null,
          is_completed: row.status === 'done',
          // Visibility fields (Problem 5)
          duration_days: row.duration_days ?? null,
          start_date: row.start_date ?? null,
          visible_from: row.visible_from ?? null,
          visible_until: row.visible_until ?? null,
          deleted_at: row.deleted_at ?? null,
        } as Task));
      }
      
      // PROBLEM 2: Ensure active occurrences for all recurring templates
      // Check and create active occurrences if needed (prevents overlap)
      const templates = tasks.filter(t => isRecurringTemplate(t));
      for (const template of templates) {
        try {
          await ensureActiveOccurrence(template, tasks);
          // Reload tasks to get newly created occurrences
          tasks = await db.loadTasksFromCache(userId);
        } catch (error) {
          console.error(`[TaskStore] Error ensuring active occurrence for template ${template.id}:`, error);
        }
      }
      
      console.log('[TaskStore] Loaded', tasks.length, 'tasks');
      set({ tasks, isLoading: false });
    } catch (error) {
      console.error('[TaskStore] Error fetching tasks:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  addTask: async (task) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      const now = new Date().toISOString();
      
      // Calculate visibility (Problem 5: Deadline-anchored duration)
      const durationDays = (task as any).duration_days ?? null;
      const startDate = (task as any).start_date ?? null;
      const visibility = calculateVisibility(task.deadline, durationDays, startDate);
      
      // Apply recurring config with defaults if recurring
      const taskWithConfig = applyRecurringConfig(
        {
          ...task,
          id: crypto.randomUUID(),
          user_id: userId,
          created_at: now,
          updated_at: now,
          status: task.status || 'pending',
          pinned: task.pinned || false,
          is_completed: task.status === 'done',
          // Add visibility fields
          duration_days: durationDays,
          start_date: startDate,
          visible_from: visibility.visible_from,
          visible_until: visibility.visible_until,
        } as any,
        task.recurring_options || null
      );

      // Write template task to SQLite first (offline-first)
      await db.upsertTaskToCache(taskWithConfig);
      
      // PROBLEM 2: For recurring tasks, ensure active occurrence instead of pre-generating all
      if (taskWithConfig.recurring_options && taskWithConfig.recurring_options.type !== 'none') {
        console.log('[TaskStore] Ensuring active occurrence for recurring task:', taskWithConfig.id);
        
        // Load current tasks to check for existing occurrences
        const currentTasks = await db.loadTasksFromCache(userId);
        const activeOccurrence = await ensureActiveOccurrence(taskWithConfig, currentTasks);
        
        // Prepare tasks to push (template + active occurrence if created)
        const tasksToPush = [taskWithConfig];
        if (activeOccurrence) {
          tasksToPush.push(activeOccurrence);
        }
        
        try {
          // Push template + active occurrence to Supabase in batch
          await pushTasksToSupabaseBatch(tasksToPush);
          console.log('[TaskStore] Template + active occurrence pushed to Supabase successfully');
        } catch (error) {
          console.error('[TaskStore] Error pushing tasks to Supabase:', error);
          // Continue anyway - tasks are in local state
        }
        
        // Update local state with template + active occurrence immediately for instant UI feedback
        set((state) => ({ tasks: [...state.tasks, taskWithConfig, ...(activeOccurrence ? [activeOccurrence] : [])] }));
      } else {
        // Push to Supabase in background (fire and forget)
        pushTaskToSupabase(taskWithConfig).catch((error) => {
          console.error('[TaskStore] Error pushing task to Supabase:', error);
          // Task is still in local DB, will sync later
        });
        
        // Update local state with just the task
        set((state) => ({ tasks: [...state.tasks, taskWithConfig] }));
      }
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // SECURITY: Verify task belongs to current user before updating
      const currentTask = await db.getTaskById(id, userId);
      if (!currentTask) {
        throw new Error("Task not found or access denied");
      }

      // Also check in local state for consistency
      const localTask = get().tasks.find((t) => t.id === id && t.user_id === userId);
      if (!localTask) {
        throw new Error("Task not found in local state");
      }

      // PROBLEM 9: Prevent completing recurring templates
      // Only occurrences can be completed, templates cannot
      if (updates.status === 'done' && isRecurringTemplate(currentTask)) {
        throw new Error("Cannot complete recurring template. Only occurrences can be completed.");
      }

      // Apply recurring config with defaults if recurring
      const taskWithUpdates = {
        ...currentTask,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Recalculate visibility if deadline, duration_days, or start_date changed (Problem 5 & 11)
      const finalDeadline = taskWithUpdates.deadline ?? currentTask.deadline;
      const finalDurationDays = (taskWithUpdates as any).duration_days ?? (currentTask as any).duration_days ?? null;
      const finalStartDate = (taskWithUpdates as any).start_date ?? (currentTask as any).start_date ?? null;
      const visibility = calculateVisibility(finalDeadline, finalDurationDays, finalStartDate);
      
      const updatedTask = {
        ...applyRecurringConfig(
          taskWithUpdates,
          taskWithUpdates.recurring_options || null
        ),
        // Update visibility fields
        duration_days: finalDurationDays,
        visible_from: visibility.visible_from,
        visible_until: visibility.visible_until,
      };

      // Check if this is a recurring task - if so, handle instance regeneration
      const isRecurring = updatedTask.recurring_options && updatedTask.recurring_options.type !== 'none';
      
      if (isRecurring) {
        // PROBLEM 2: Delete all future instances (they will be recreated on-demand)
        console.log('[TaskStore] Deleting future instances for recurring task');
        await deleteFutureInstances(updatedTask);
      }

      // Update template task in SQLite first (offline-first)
      await db.upsertTaskToCache(updatedTask);
      
      // PROBLEM 2: For recurring tasks, ensure active occurrence instead of pre-generating all
      if (isRecurring) {
        console.log('[TaskStore] Ensuring active occurrence for updated recurring task');
        
        // Load current tasks to check for existing occurrences
        const currentTasks = await db.loadTasksFromCache(userId);
        const activeOccurrence = await ensureActiveOccurrence(updatedTask, currentTasks);
        
        // Prepare tasks to push (template + active occurrence if created)
        const tasksToPush = [updatedTask];
        if (activeOccurrence) {
          tasksToPush.push(activeOccurrence as any);
        }
        
        try {
          // Push template + active occurrence to Supabase in batch
          await pushTasksToSupabaseBatch(tasksToPush);
          console.log('[TaskStore] Template + active occurrence pushed to Supabase successfully');
        } catch (error) {
          console.error('[TaskStore] Error pushing tasks to Supabase:', error);
          // Continue anyway
        }
        
        // Refresh from cache to get all tasks (template + instances)
        const cachedTasks = await db.loadTasksFromCache(userId);
        if (cachedTasks.length > 0) {
          set({ tasks: cachedTasks });
        }
      } else {
        // Push to Supabase in background
        pushTaskToSupabase(updatedTask).catch((error) => {
          console.error('[TaskStore] Error pushing task to Supabase:', error);
        });
        
        // Update local state for non-recurring task
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        }));
      }
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // SECURITY: Load the task and verify it belongs to current user
      const taskToDelete = await db.getTaskById(id, userId);
      if (!taskToDelete) {
        console.warn('[TaskStore] Task not found or access denied:', id);
        throw new Error("Task not found or access denied");
      }

      // Additional security check: verify user_id matches
      if (taskToDelete.user_id !== userId) {
        console.error('[TaskStore] SECURITY: Attempt to delete task belonging to another user:', id);
        throw new Error("Access denied: Cannot delete tasks belonging to other users");
      }

      const tasksToDelete: string[] = [id]; // Always delete the requested task
      
      // Check if this is a recurring template
      if (isRecurringTemplate(taskToDelete)) {
        console.log('[TaskStore] Task is a recurring template, deleting all instances');
        
        // Find and delete all instances
        const allTasks = await db.loadTasksFromCache(userId);
        const instances = findAllInstancesFromTemplate(taskToDelete, allTasks);
        
        for (const instance of instances) {
          // SECURITY: Verify instance belongs to user before deleting
          if (instance.user_id === userId) {
            tasksToDelete.push(instance.id);
            await db.deleteTaskFromCache(instance.id, userId);
          } else {
            console.warn('[TaskStore] SECURITY: Skipping instance belonging to another user:', instance.id);
          }
        }
        
        // Delete the template
        await db.deleteTaskFromCache(id, userId);
        
        console.log(`[TaskStore] Deleted template + ${instances.length} instances`);
      } else {
        // Regular task or instance - delete only this task
        await db.deleteTaskFromCache(id, userId);
        console.log('[TaskStore] Deleted single task (non-template)');
      }
      
      // Update local state - remove all deleted tasks
      set((state) => ({
        tasks: state.tasks.filter((t) => !tasksToDelete.includes(t.id)),
      }));

      // Delete from Supabase in background - delete all tasks in parallel
      Promise.all(
        tasksToDelete.map(taskId => 
          deleteTaskFromSupabase(taskId, userId).catch((error) => {
            console.error(`[TaskStore] Error deleting task ${taskId} from Supabase:`, error);
          })
        )
      ).catch((error) => {
        console.error('[TaskStore] Some deletions failed:', error);
      });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  sync: async () => {
    try {
      set({ isLoading: true, error: null });
      console.log('[TaskStore] Starting sync...');
      const tasks = await syncNow();
      console.log('[TaskStore] Sync completed, updating store with', tasks.length, 'tasks');
      // Update store with synced tasks
      set({ tasks, isLoading: false });
    } catch (error) {
      console.error('[TaskStore] Sync error:', error);
      set({ error: String(error), isLoading: false });
      // Even on error, try to load from cache
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const cachedTasks = await db.loadTasksFromCache(userId);
          console.log('[TaskStore] Fallback: Loaded', cachedTasks.length, 'tasks from cache');
          set((state) => ({ ...state, tasks: cachedTasks }));
        }
      } catch (cacheError) {
        console.error('[TaskStore] Error loading from cache:', cacheError);
      }
    }
  },

  // Soft delete functions (Problem 13)
  softDeleteTask: async (id) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Soft delete in cache
      await dbTrash.softDeleteTask(id, userId);

      // Update local state - remove from tasks array
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));

      // Sync to Supabase
      await syncNow();
    } catch (error) {
      console.error('[TaskStore] Error soft deleting task:', error);
      throw error;
    }
  },

  softDeleteAllTasks: async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Soft delete all in cache
      const count = await dbTrash.softDeleteAllTasks(userId);

      // Clear local state
      set({ tasks: [] });

      // Sync to Supabase
      await syncNow();

      return count;
    } catch (error) {
      console.error('[TaskStore] Error soft deleting all tasks:', error);
      throw error;
    }
  },

  restoreTask: async (id) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Restore in cache
      await dbTrash.restoreTask(id, userId);

      // Reload tasks to include restored task
      const tasks = await db.loadTasksFromCache(userId);
      set({ tasks });

      // Sync to Supabase
      await syncNow();
    } catch (error) {
      console.error('[TaskStore] Error restoring task:', error);
      throw error;
    }
  },

  hardDeleteTask: async (id) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Hard delete from cache
      await dbTrash.hardDeleteTask(id, userId);

      // Hard delete from Supabase (permanent deletion)
      await deleteTaskFromSupabase(id, userId);
    } catch (error) {
      console.error('[TaskStore] Error hard deleting task:', error);
      throw error;
    }
  },

  emptyTrash: async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Not authenticated");
      }

      // Get all trash task IDs before deleting
      const trashTasks = await dbTrash.loadTrashFromCache(userId);
      const trashTaskIds = trashTasks.map(t => t.id);

      // Hard delete all from cache
      const count = await dbTrash.emptyTrash(userId);

      // Hard delete all from Supabase
      for (const taskId of trashTaskIds) {
        try {
          await deleteTaskFromSupabase(taskId, userId);
        } catch (error) {
          console.warn(`[TaskStore] Failed to delete task ${taskId} from Supabase:`, error);
          // Continue deleting other tasks even if one fails
        }
      }

      return count;
    } catch (error) {
      console.error('[TaskStore] Error emptying trash:', error);
      throw error;
    }
  },
}));
