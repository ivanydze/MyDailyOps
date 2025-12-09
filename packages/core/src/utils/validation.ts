/**
 * Validation Utilities
 */

import type { Task } from "../models/task";

/**
 * Validate task data
 */
export function validateTask(task: Partial<Task>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push("Task title is required");
  }

  if (task.title && task.title.length > 200) {
    errors.push("Task title must be less than 200 characters");
  }

  if (task.priority && !["low", "medium", "high"].includes(task.priority)) {
    errors.push("Priority must be low, medium, or high");
  }

  if (task.dueDate) {
    const date = new Date(task.dueDate);
    if (isNaN(date.getTime())) {
      errors.push("Invalid due date format");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

