/**
 * Core Task Model
 * Shared between mobile and desktop applications
 */

export type TaskPriority = "low" | "medium" | "high";

// Simple RecurringType for Task model (different from RecurrenceConfig.type)
export type RecurringType = "daily" | "weekly" | "monthly" | "weekday" | "none";

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: TaskPriority;
  dueDate?: string; // ISO 8601 date string
  isCompleted: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string;

  // Recurring task properties
  isRecurring: boolean;
  recurringType?: RecurringType;
  recurringInterval?: number; // For daily/interval tasks
  recurringDaysOfWeek?: number[]; // 0-6, Sunday-Saturday
  recurringEndDate?: string | null; // ISO 8601 date string
  parentRecurringId?: string | null; // Link to parent recurring task

  // Legacy fields for backward compatibility (optional)
  recurring?: boolean;
  recurring_options?: RecurringOptions | null;

  // Timezone-safe time fields (Problem 17: Timezone-Safe Task Time)
  event_time?: string; // HH:mm format (e.g., "14:00")
  event_timezone?: string; // IANA timezone identifier (e.g., "Europe/London")
}

/**
 * Modern recurring options structure (JSON)
 */
export interface RecurringOptions {
  type:
    | "none"
    | "daily"
    | "interval"
    | "weekly"
    | "monthly_date"
    | "monthly_weekday";
  interval_days?: number;
  weekdays?: ("sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat")[];
  dayOfMonth?: number; // 1-31
  weekNumber?: number; // 1,2,3,4 or -1 (last)
  // Generation configuration
  generate_unit?: "days" | "weeks" | "months";
  generate_value?: number;
  custom?: boolean;
}

/**
 * Create a new task with default values
 */
export function createTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: overrides.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
    title: overrides.title || "",
    description: overrides.description,
    category: overrides.category,
    priority: overrides.priority || "medium",
    dueDate: overrides.dueDate,
    isCompleted: overrides.isCompleted ?? false,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    isRecurring: overrides.isRecurring ?? false,
    recurringType: overrides.recurringType,
    recurringInterval: overrides.recurringInterval,
    recurringDaysOfWeek: overrides.recurringDaysOfWeek,
    recurringEndDate: overrides.recurringEndDate,
    parentRecurringId: overrides.parentRecurringId,
    event_time: overrides.event_time,
    event_timezone: overrides.event_timezone,
    ...overrides,
  };
}

/**
 * Normalize task to ensure consistent structure
 */
export function normalizeTask(task: Partial<Task>): Task {
  return createTask(task);
}

