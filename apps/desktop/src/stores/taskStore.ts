import { create } from "zustand";
import type { Task } from "@mydailyops/core";
import * as db from "../lib/db";
import { getCurrentUserId, supabase } from "../lib/supabaseClient";
import { pushTaskToSupabase, pushTasksToSupabaseBatch, deleteTaskFromSupabase, syncNow } from "../services/syncService";
import { 
  generateRecurringInstances, 
  deleteFutureInstances, 
  applyRecurringConfig,
  isRecurringTemplate,
  findAllInstancesFromTemplate,
  deleteAllInstances,
} from "../utils/recurring";

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
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
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
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
        }));
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
        },
        task.recurring_options || null
      );

      // Write template task to SQLite first (offline-first)
      await db.upsertTaskToCache(taskWithConfig);
      
      // Generate recurring instances if this is a recurring task
      if (taskWithConfig.recurring_options && taskWithConfig.recurring_options.type !== 'none') {
        console.log('[TaskStore] Generating recurring instances for task:', taskWithConfig.id);
        const instances = await generateRecurringInstances(taskWithConfig);
        console.log('[TaskStore] Generated', instances.length, 'instances');
        
        try {
          // Push template + all instances to Supabase in batch (more efficient)
          const allTasksToPush = [taskWithConfig, ...instances];
          await pushTasksToSupabaseBatch(allTasksToPush);
          console.log('[TaskStore] Template + all instances pushed to Supabase successfully');
        } catch (error) {
          console.error('[TaskStore] Error pushing tasks to Supabase:', error);
          // Continue anyway - tasks are in local state
        }
        
        // Update local state with template + all instances immediately for instant UI feedback
        set((state) => ({ tasks: [...state.tasks, taskWithConfig, ...instances] }));
        
        // Refresh from Supabase after a delay to get all tasks (including instances that were just pushed)
        // This ensures Supabase has processed all batch inserts
        const userIdForRefresh = await getCurrentUserId();
        if (userIdForRefresh) {
          setTimeout(async () => {
            console.log('[TaskStore] Refreshing tasks from Supabase after batch push');
            await get().fetchTasks();
          }, 2000);
        }
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
      const currentTask = get().tasks.find((t) => t.id === id);
      if (!currentTask) {
        throw new Error("Task not found");
      }

      // Apply recurring config with defaults if recurring
      const taskWithUpdates = {
        ...currentTask,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      const updatedTask = applyRecurringConfig(
        taskWithUpdates,
        taskWithUpdates.recurring_options || null
      );

      // Check if this is a recurring task - if so, handle instance regeneration
      const isRecurring = updatedTask.recurring_options && updatedTask.recurring_options.type !== 'none';
      
      if (isRecurring) {
        // Delete all future instances before updating template
        console.log('[TaskStore] Deleting future instances for recurring task');
        await deleteFutureInstances(updatedTask);
      }

      // Update template task in SQLite first (offline-first)
      await db.upsertTaskToCache(updatedTask);
      
      // Regenerate future instances if recurring
      if (isRecurring) {
        console.log('[TaskStore] Regenerating recurring instances for task:', updatedTask.id);
        const instances = await generateRecurringInstances(updatedTask);
        console.log('[TaskStore] Generated', instances.length, 'instances');
        
        try {
          // Push template + all instances to Supabase in batch
          const allTasksToPush = [updatedTask, ...instances];
          await pushTasksToSupabaseBatch(allTasksToPush);
          console.log('[TaskStore] Template + all instances pushed to Supabase successfully');
        } catch (error) {
          console.error('[TaskStore] Error pushing tasks to Supabase:', error);
          // Continue anyway
        }
        
        // Refresh from cache/ Supabase to get all tasks (template + instances)
        const userId = await getCurrentUserId();
        if (userId) {
          // Try to load from cache first
          const cachedTasks = await db.loadTasksFromCache(userId);
          if (cachedTasks.length > 0) {
            set({ tasks: cachedTasks });
          } else {
            // If cache is empty (browser mode), fetch from Supabase after a delay
            setTimeout(async () => {
              await get().fetchTasks();
            }, 1000);
          }
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

      // Load the task first to determine if it's a template or instance
      const taskToDelete = await db.getTaskById(id);
      if (!taskToDelete) {
        console.warn('[TaskStore] Task not found:', id);
        return;
      }

      const tasksToDelete: string[] = [id]; // Always delete the requested task
      
      // Check if this is a recurring template
      if (isRecurringTemplate(taskToDelete)) {
        console.log('[TaskStore] Task is a recurring template, deleting all instances');
        
        // Find and delete all instances
        const allTasks = await db.loadTasksFromCache(userId);
        const instances = findAllInstancesFromTemplate(taskToDelete, allTasks);
        
        for (const instance of instances) {
          tasksToDelete.push(instance.id);
          await db.deleteTaskFromCache(instance.id);
        }
        
        // Delete the template
        await db.deleteTaskFromCache(id);
        
        console.log(`[TaskStore] Deleted template + ${instances.length} instances`);
      } else {
        // Regular task or instance - delete only this task
        await db.deleteTaskFromCache(id);
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
}));
