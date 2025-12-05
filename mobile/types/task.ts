export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskFilter = 'all' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'done';

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
}
