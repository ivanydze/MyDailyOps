/**
 * Types for Weekly Checklists
 * Problem 10: Always-Show Tasks → Weekly Checklists
 */

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  created_at: string; // ISO date string
}

export interface WeeklyChecklist {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date string (YYYY-MM-DD)
  week_end_date: string;   // ISO date string (YYYY-MM-DD)
  title?: string;
  items: ChecklistItem[];
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface WeeklyChecklistHistoryItem {
  week_start_date: string;
  week_end_date: string;
  title?: string;
  total_items: number;
  completed_items: number;
  completion_percentage: number;
}

