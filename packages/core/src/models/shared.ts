/**
 * Shared types matching mobile app and Supabase schema
 * These types must match exactly what mobile uses
 */

export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskFilter = 'all' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'done';

export type RecurringOptions = {
  type:
    | "none"
    | "daily"
    | "interval"
    | "weekly"
    | "monthly_date"
    | "monthly_weekday";

  // Pre-generation configuration
  generate_unit?: 'days' | 'weeks' | 'months';
  generate_value?: number; // How many units to generate
  custom?: boolean; // Whether user chose custom value

  // Recurrence pattern fields
  interval_days?: number;
  weekdays?: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[];
  dayOfMonth?: number; // 1–31
  weekNumber?: number; // 1,2,3,4 or -1 (last)
};

export interface Task {
  id: string; // UUID from Supabase
  user_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  deadline: string | null;
  status: TaskStatus;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  // Recurring task fields - JSON structure
  recurring_options: RecurringOptions | null;
  // Legacy field for compatibility (computed from recurring_options)
  is_completed?: boolean; // true if status === 'done'
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  pendingChanges: number;
}

